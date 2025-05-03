// website_script.js
$("body").removeClass('bg-light');

var handleDrag = function(e) {
    //kill any default behavior
    e.stopPropagation();
    e.preventDefault();
};
var handleDrop = function(e) {
    //kill any default behavior
    e.stopPropagation();
    e.preventDefault();
    //console.log(e);
    //get x and y coordinates of the dropped item
    x = e.clientX;
    y = e.clientY;
    //drops are treated as multiple files. Only dealing with single files right now, so assume its the first object you're interested in
    var file = e.dataTransfer.files[0];
    //don't try to mess with non-image files
    if (file.type.match('image.*')) {
        //then we have an image,

        //we have a file handle, need to read it with file reader!
        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(theFile) {
            //get the data uri
            var dataURI = theFile.target.result;
            //make a new image element with the dataURI as the source
            var img = document.createElement("img");
            img.src = dataURI;

            //Insert the image at the carat

            // Try the standards-based way first. This works in FF
            if (document.caretPositionFromPoint) {
                var pos = document.caretPositionFromPoint(x, y);
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
                range.collapse();
                range.insertNode(img);
            }
            // Next, the WebKit way. This works in Chrome.
            else if (document.caretRangeFromPoint) {
                range = document.caretRangeFromPoint(x, y);
                range.insertNode(img);
            }
            else
            {
                //not supporting IE right now.
                console.log('could not find carat');
            }


        });
        //this reads in the file, and the onload event triggers, which adds the image to the div at the carat
        reader.readAsDataURL(file);
    }
};

function pasteImage(e) {                                                      // When there's an paste event on our target DIV:
   let cbPayload = [...(e.clipboardData || e.originalEvent.clipboardData).items];     // Capture the ClipboardEvent's eventData payload as an array
       cbPayload = cbPayload.filter(i => /image/.test(i.type));                       // Strip out the non-image bits
   
   if(!cbPayload.length || cbPayload.length === 0) return false;                      // If no image was present in the collection, bail.
   
   let reader = new FileReader();                                                     // Instantiate a FileReader...
   reader.onload = (e) => contentTarget.innerHTML = `<img src="${e.target.result}">`; // ... set its onLoad to render the event target's payload
   reader.readAsDataURL(cbPayload[0].getAsFile());                                    // ... then read in the pasteboard image data as Base64
}


var setupContentEditable = (cssClass) => {
    var dropZone = $(cssClass).get(0);
    dropZone.addEventListener('dragover', handleDrag, false);
    dropZone.addEventListener('drop', handleDrop, false);
    dropZone.addEventListener('onpaste', pasteImage, false);
}

function generateGoogleCalendarLink(event) {
    var MS_IN_MINUTES = 60 * 1000;
    let startTime = formatTime(event.start);
    let endTime = calculateEndTime(event);

    let href = encodeURI([
        'https://www.google.com/calendar/render',
        '?action=TEMPLATE',
        '&text=' + (event.title || ''),
        '&dates=' + (startTime || ''),
        '/' + (endTime || ''),
        '&details=' + (event.description || ''),
        '&location=' + (event.address || ''),
        '&sprop=&sprop=name:'
    ].join(''));
    return href;
    
    function formatTime(date) {
        return date.toISOString().replace(/-|:|\.\d+/g, '');
    };
    
    function calculateEndTime(event) {
        return event.end ?
          formatTime(event.end) :
          formatTime(new Date(event.start.getTime() + (event.duration * MS_IN_MINUTES)));
    };
}




	if (navigator.doNotTrack != 1 && !window.is_404) {
		frappe.ready(() => {
			let browser = frappe.utils.get_browser();
			let query_params = frappe.utils.get_query_params();

			// Get visitor ID based on browser uniqueness
			import('/assets/frappe/js/lib/fingerprintjs.js')
				.then(fingerprint_js => fingerprint_js.load())
				.then(fp => fp.get())
				.then(result => {
					frappe.call("frappe.website.doctype.web_page_view.web_page_view.make_view_log", {
						referrer: document.referrer,
						browser: browser.name,
						version: browser.version,
						user_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
						source: query_params.source || query_params.utm_source,
						medium: query_params.medium || query_params.utm_medium,
						campaign: query_params.campaign || query_params.utm_campaign,
						content: query_params.content || query_params.utm_content,
						visitor_id: result.visitorId
					})
			})
		})
	}
