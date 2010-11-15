(function($) {
	//declare variables and object references that will be needed class-wide
	var myMessengerDetails;
	var checkTimer;
	var statusBoxTimer;
	var displayName = "";
	var settings;
	var defaults;

	var cookieName = "messengerStatus";
	var cookiePersistence = 5;

	//extend the jQuery object with this plugin, and receive the user's self-defined options
	$.fn.messengerStatus = function(options) {
		//set the default values of all possible options
		defaults = {
			checkInterval: 30000,
			liveID: "",
			displayStatusBox: true,
			statusBoxCorner: "bottom-right",
			statusBoxDuration: 5000,
			statusBoxInset: 8,
			animationSpeed: 1000,
			displayPicture: "",
			displayPictureFrame: "displayPictureFrame.gif",
			statusMessages: ["$ is now signed in", "$ has just signed out", "$ is now away", "$ is now busy"],
			onStatusChange: function() {},
			onStatusBoxClick: function() {}
		};

		//keep a backup of the defaults: we'll restore them soon
		var backupDefaults = defaults;

		//merge the options with the defaults, and store them as the settings
		settings = $.extend(false, defaults, options);

		//and then restore the defaults back to their...default
		defaults = backupDefaults;

		//check that the user hasn't entered any invalid settings, or failed to specify any
		//settings that are critical for the plugin to run
		if (checkSettings()) {
			//set the ball rolling by retrieving the user's status for the first time
			$.fn.messengerStatus.getStatus();
		}

		//return the jQuery object to allow for chainability
		return this;
	};

	//whenever the user's details have been updated (the first time the details are retrieved,
	//or when the user's status has changed), show the user's status in the box (if they have
	//chosen to see one and the status has not changed between pages), trigger the
	//onStatusChange callback, and update the cookie
	$(document).bind("updateMessengerDetails", function(event) {
		//if we don't have the user's name (the user has not come online yet), don't fire the
		//callback, set a cookie, or show a status box
		if (myMessengerDetails.displayName == "") {
			return;
		}

		//execute the onStatusChange callback
		settings.onStatusChange(myMessengerDetails);

		//if we're intending to display a status box
		if (settings.displayStatusBox) {
			//get the data stored in the cookie
			var cookieData = getCookie(cookieName);
			//if there is no cookie yet, or the cookie's status is different to the new one
			if (cookieData != myMessengerDetails.status) {
				//show the status box
				showStatusBox();
			}
		}

		//and set the cookie with the new status
		setCookie(cookieName, myMessengerDetails.status, cookiePersistence);
	});

	//whenever the user clicks on any part of the status box that isn't a link or button, this
	//event is triggered. this event triggers the onStatusBoxClick callback
	$(document).bind("clickStatusBox", function() {
		//execute the onStatusBoxClick callback
		settings.onStatusBoxClick(myMessengerDetails);
	});

	//determines whether we can run this plugin or not. we need certain settings to be present,
	//and certain combinations of data, or else we can't operate properly. also performs checks
	//on the validity of the settings (negative numbers, correct data types, etc)
	//return TRUE to run the plugin, FALSE to stop execution
	function checkSettings() {
		//we can't run this without having the ID of the user to get the details of
		if ((settings.liveID == "") || (typeof settings.liveID != "string")) {
			alert("You must specify the ID of the Windows Live account to display the status of.");
			return false;
		}

		//the check interval must be a positive number. if it's not, use the default
		if ((settings.checkInterval < 0) || (typeof settings.checkInterval != "number")) {
			settings.checkInterval = defaults.checkInterval;
		}

		//if the displayStatusBox setting is not a boolean value, set it back to its default
		if (typeof settings.displayStatusBox != "boolean") {
			settings.displayStatusBox = defaults.displayStatusBox;
		}

		//if the status box duration setting is not a number, or it's less than zero, then set
		//it back to its default
		if ((typeof settings.statusBoxDuration != "number") || (settings.statusBoxDuration < 0)) {
			settings.statusBoxDuration = defaults.statusBoxDuration;
		}

		//if the user has specified that the status box be shown for longer than the checking
		//interval, then set the time it should be shown to the checking interval (or else we
		//could have multiple status boxes at the same time)
		if (settings.statusBoxDuration > settings.checkInterval) {
			settings.statusBoxDuration = settings.checkInterval;
		}

		//if the user provided a status box corner setting that is not the name of a valid
		//corner, then set the setting back to the default
		if ((settings.statusBoxCorner == "top-left") || (settings.statusBoxCorner == "top-right") || (settings.statusBoxCorner == "bottom-right") || (settings.statusBoxCorner == "bottom-left")) {
			//the user entered a valid corner, or left it as the default
		}
		else {
			//the user entered an invalid corner: set it back to the default
			settings.statusBoxCorner = defaults.statusBoxCorner;
		}

		//if the inset of the status box is not a number, or it is less than zero, then we'll
		//revert it back to the default
		if ((typeof settings.statusBoxInset != "number") || (settings.statusBoxInset < 0)) {
			settings.statusBoxInset = defaults.statusBoxInset;
		}

		//if the animation speed is not a number, or is less than zero, then revert to the default
		if ((typeof settings.animationSpeed != "number") || (settings.animationSpeed < 0)) {
			settings.animationSpeed = defaults.animationSpeed;
		}

		//if the display picture frame is not a string, then revert it back to the default
		if (typeof settings.displayPictureFrame != "string") {
			settings.displayPictureFrame = defaults.displayPictureFrame;
		}

		//if the display picture is not a string, then revert it back to the default
		if (typeof settings.displayPicture != "string") {
			settings.displayPicture = defaults.displayPicture;
		}

		//if the status messages setting is not an object (array), or it doesn't have the same
		//amount of values as the default status messages array, then revert it back to the default
		if ((typeof settings.statusMessages != "object") || (settings.statusMessages.length != defaults.statusMessages.length)) {
			settings.statusMessages = defaults.statusMessages;
		}

		//if we've gotten this far, then the data is sufficiently valid: continue running the plugin
		return true;
	}

	//cue the getStatus() method to run after the specified amount of time
	function setCheckTimer() {
		checkTimer = setTimeout("$.fn.messengerStatus.getStatus()", settings.checkInterval);
	}

	//cancel the getStatus() method's time cue
	function clearCheckTimer() {
		clearTimeout(checkTimer);
	}

	//create and set a cookie with the passed in name and value, to expire the specified number of
	//minutes from now
	function setCookie(name, value, numMinutes) {
		var path = "/";
		var expireTime = new Date();
		expireTime.setTime(expireTime.getTime() + (numMinutes * 1000 * 60));
		expireTime = expireTime.toUTCString();
		document.cookie = name + "=" + value + "; expires=" + expireTime + "; path=" + path;
	}

	//get and return the value of the cookie with the passed in name, if it exists
	function getCookie(name) {
		var key = name + "=";
		var cookies = document.cookie.split(";");
		var result = null;
		$.each(cookies, function(index, value) {
			var thisCookie = value;
			while (thisCookie.charAt(0) == " ") {
				thisCookie = thisCookie.substring(1, thisCookie.length);
			}
			if (thisCookie.indexOf(key) == 0) {
				result = thisCookie.substring(key.length, thisCookie.length);
				return false;
			}
		});
		return result;
	}

	//called when the JSON data has been received, this method creates a new object to store the
	//details in, and triggers the updateMessengerDetails event on the document if the data came
	//back successfully, and the user's status is different from last time (or this is the first time)
	function receiveStatus(data) {
		//if the data was received successfully...
		if ((data.result.code == "200") && (data.result.response == "OK")) {
			//...and if either there are no current details, or the user's status has changed
			if ((myMessengerDetails == null) || (data.status != myMessengerDetails.status)) {
				//if the display name that we just received is different to the one that we have
				//stored, and it's not empty, then store it
				if ((displayName != data.displayName) && (data.displayName != "")) {
					displayName = data.displayName;
				}
				//create a new object containing the new details and store in myMessengerDetails
				myMessengerDetails = new MessengerDetails(data.id, data.status, data.statusText, displayName, data.icon.url, data.icon.width, data.icon.height);
				//and trigger the updateMessengerDetails event that we recently bound to the document
				$(document).trigger("updateMessengerDetails");
			}
		}
		//and finally, set the details to be retrieved again after the specified amount of time
		setCheckTimer();
	}

	//imitates the messenger application's status box and displays the status of the user in it
	function showStatusBox() {
		//insert the status box right at the end of the page's body, with all of the divs inside
		$("body")
			.append("<div id='statusBox'><div id='statusBoxTop'><div id='statusBoxTopLeft'></div><div id='statusBoxTopRight'></div><div class='statusBoxClear'></div></div><div id='statusBoxMain'><div id='statusBoxDisplayPictureFrame'></div><div id='statusBoxStatusMessage'></div></div><div class='statusBoxClear'></div><div id='statusBoxBottom'></div></div>");
		//then fill the status box with the content
		$("#statusBox #statusBoxTop #statusBoxTopLeft")
			.html("<img src='" + myMessengerDetails.iconURL + "' /> Windows Live Messenger");
		$("#statusBox #statusBoxTop #statusBoxTopLeft img")
			.css({width: myMessengerDetails.iconWidth + "px", height: myMessengerDetails.iconHeight + "px"})
			.attr("alt", myMessengerDetails.status)
			.attr("align", "left");
		$("#statusBox #statusBoxTop #statusBoxTopRight")
			.html("x")
			.attr("title", "Close")
			//when the user clicks the close section of the status box, hide the status box immediately
			.click(function() {
				$.fn.messengerStatus.hideStatusBox();
			});
		$("#statusBox #statusBoxMain #statusBoxDisplayPictureFrame")
			.css({backgroundImage: "url(" + settings.displayPictureFrame + ")"});
		$("#statusBox #statusBoxMain #statusBoxStatusMessage")
			.html("<span>" + getStatusMessage() + "</span>");
		$("#statusBox #statusBoxBottom")
			.html("Disable")
			.attr("title", "Stop checking " + myMessengerDetails.displayName + "'s status")
			//when the user clicks the Disable text in the status box, cancel the periodic status checks,
			//and then get rid of this status box
			.click(function() {
				$.fn.messengerStatus.stopCheckingStatus();
				$.fn.messengerStatus.hideStatusBox();
			});
		//set the status box to appear on either the top or bottom of the window depending on the first
		//part of the statusBoxCorner setting
		(settings.statusBoxCorner.split("-")[0] == "top")
			? $("#statusBox").css({top: settings.statusBoxInset + "px"})
			: $("#statusBox").css({bottom: settings.statusBoxInset + "px"});
		//set the status box to appear on either the left or right of the window depending on the second
		//part of the statusBoxCorner setting
		(settings.statusBoxCorner.split("-")[1] == "left")
			? $("#statusBox").css({left: settings.statusBoxInset + "px"})
			: $("#statusBox").css({right: settings.statusBoxInset + "px"});
		//and place the user's display picture in the status box, if they selected that
		showDisplayPicture();
		$("#statusBox")
			.click(function(event) {
				//when the user clicks on the status box
				var theClickedElement = $(event.target);
				//if the area that was clicked on was not the close or disable sections
				if ((theClickedElement.html() != "x") && (theClickedElement.html() != "Disable")) {
					//trigger the event assigned to the click of the status box
					$(document).trigger("clickStatusBox");
				}
			})
			//and display the status box to the user
			.slideDown(settings.animationSpeed, function() {
				//and when all that's done, cue it up to disappear after the desired amount of time
				statusBoxTimer = setTimeout("$.fn.messengerStatus.hideStatusBox()", settings.statusBoxDuration);
			});
	}

	//detects whether the user gave us a display picture to show in the status box, and if
	//so, places it into the statusBoxDisplayPictureFrame div
	function showDisplayPicture() {
		if (settings.displayPicture != "") {
			$("#statusBoxDisplayPictureFrame")
				.html("<div></div>");
			$("#statusBoxDisplayPictureFrame div")
				.css({backgroundImage: "url(" + settings.displayPicture + ")"});
		}
	}

	//returns an appropriate status message to be shown in the status box, depending on the
	//statusMessage in the setting that corresponds with the user's status
	function getStatusMessage() {
		var statusMessage;

		switch(myMessengerDetails.status) {
			case "Online":
				statusMessage = settings.statusMessages[0];
				break;
			case "Offline":
				statusMessage = settings.statusMessages[1];
				break;
			case "Away":
				statusMessage = settings.statusMessages[2];
				break;
			case "Busy":
				statusMessage = settings.statusMessages[3];
				break;
			default:
				statusMessage = "$ is not signed into Windows Live Messenger";
				break;
		}

		//and replace the dollar signs with the user's display name
		statusMessage = statusMessage.replace("$", myMessengerDetails.displayName);

		return statusMessage;
	}

	//the class that is used to hold the data retrieved from the presence API
	//will only ever be one instance at a time (singleton)
	function MessengerDetails(newID, newStatus, newStatusText, newDisplayName, newIconURL, newIconWidth, newIconHeight) {
		this.ID = newID;
		this.status = newStatus;
		this.statusText = newStatusText;
		this.displayName = newDisplayName;
		this.iconURL = newIconURL;
		this.iconWidth = newIconWidth;
		this.iconHeight = newIconHeight;
	}

	/*Public Functions*/
	//go to Micro$oft and retrieve the JSON data holding the user's presence details
	$.fn.messengerStatus.getStatus = function() {
		$.getScript("http://messenger.services.live.com/users/" + settings.liveID + "@apps.messenger.live.com/presence/?cb=receiveStatusCallback");
	};

	//called when the statusBoxDuration time is up, this function is in charge of making the box
	//disappear, and then removing it from the DOM when it's done. can be called publically
	$.fn.messengerStatus.hideStatusBox = function() {
		$("#statusBox").slideUp(settings.animationSpeed, function() {
			$(this).remove();
		});
	};

	//this function can be called to stop the periodic checking of the user's status
	$.fn.messengerStatus.stopCheckingStatus = function() {
		clearCheckTimer();
	};

	//this function receives the JSON data from the callback and forwards it on to the
	//private receiveStatus method for proper processing
	$.fn.messengerStatus.receiveStatusPublic = function(data) {
		receiveStatus(data);
	};
})(jQuery);

//this is the function that is executed once the JSON data has been received by MS.
//the MS API refuses to allow callback names that contain symbols in them, and
//obviously the function can't be a private method, so I've had to use this
//function to forward the JSON data into the plugin for processing
function receiveStatusCallback(data) {
	$.fn.messengerStatus.receiveStatusPublic(data);
}