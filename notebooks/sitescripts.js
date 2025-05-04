

// --- START https://frappe.io/files/page_scripts/JavaScript-f90c8-5620968ae7.js?v=d6616b96f1 ---
document.addEventListener("DOMContentLoaded",function(){const videos=document.querySelectorAll("video");videos.forEach(function(video){const toggle_video_control=function(e){if(video.paused){video.setAttribute("controls","")
video.removeEventListener("click",toggle_video_control);video.play();e.preventDefault();}}
video.addEventListener("click",toggle_video_control);});});
// --- END https://frappe.io/files/page_scripts/JavaScript-f90c8-5620968ae7.js?v=d6616b96f1 ---


// --- START https://frappe.io/files/page_scripts/JavaScript-f991c-1980f7b50e.js?v=8c30295f34 ---
setup_sidebar_toggle();console.log("loaded")
window.addEventListener("DOMContentLoaded",async()=>{if(isMobile()||isTablet())return;document.querySelectorAll(".nav-item-title").forEach(function(el){el.style.display="none";});const sidebar=document.querySelector(".hr-sidebar");sidebar.style.transition="width .2s";sidebar.onmouseover=function(){sidebar.style.width="250px";sidebar.querySelectorAll(".nav-item-title").forEach(function(el){el.style.display="flex";});};sidebar.onmouseout=function(){document.querySelectorAll(".nav-item-title").forEach(function(el){el.style.display="none";});sidebar.style.width="50px";};});function setup_sidebar_toggle(){window.addEventListener("DOMContentLoaded",function(){console.log(document.querySelector(".frappe-sidebar-toggle"))
document.querySelector(".frappe-sidebar-toggle").addEventListener("click",()=>{document.querySelector(".hr-sidebar").style.left="0px";document.querySelector(".sidebar-backdrop").style.display="block";});document.querySelector(".sidebar-backdrop").addEventListener("click",()=>{document.querySelector(".hr-sidebar").style.left="-250px";document.querySelector(".sidebar-backdrop").style.display="none";});});}
function isMobile(){return window.matchMedia("(max-width: 767px)").matches;}
function isTablet(){return window.matchMedia("(max-width: 1024px) and (min-width: 768px)").matches;}
// --- END https://frappe.io/files/page_scripts/JavaScript-f991c-1980f7b50e.js?v=8c30295f34 ---


// --- START https://frappe.io/files/page_scripts/builder-asset-script.js?v=20fae7dd77 ---
setup_navbar_tooltip();
setup_sidebar_toggle();
setup_scroll_position_restore();
setup_thought_of_the_day();
setup_plausible();
setup_navigation_shortcut();
setup_video_player();
// setup_posthog();

function setup_video_player() {
  window.addEventListener("DOMContentLoaded", async () => {
    if (!document.querySelector("video")) return;
    await loadStyle("https://cdn.plyr.io/3.6.4/plyr.css");
    await loadScript("https://cdn.plyr.io/3.6.4/plyr.polyfilled.js");
    // setup for all video elements
    Plyr.setup("video", {
      controls: ["play-large","play","progress","mute","volume","settings","fullscreen"],
    });
  });
}


function setup_navbar_tooltip() {
	if (isMobile() || isTablet()) return;
	window.addEventListener("DOMContentLoaded", async () => {
	    try {
		    await loadScript("https://unpkg.com/@popperjs/core@2");
		    await loadScript("https://unpkg.com/tippy.js@6");
	    } catch {
	        return
	    }
		const navItems = [
			{ selector: ".nav-contents", content: "Contents" },
			{ selector: ".nav-welcome", content: "Welcome" },
			{ selector: ".nav-home", content: "Home" },
			{ selector: ".nav-products", content: "Products" },
			{ selector: ".nav-partners", content: "Partners" },
			{ selector: ".nav-blog", content: "Blog" },
			{ selector: ".nav-contact", content: "Contact" },
			{ selector: ".nav-story", content: "Story" },
			{ selector: ".nav-about", content: "About" },
			{ selector: ".nav-values", content: "Values" },
			{ selector: ".nav-vision", content: "Vision" },
			{ selector: ".nav-events", content: "Events" },
			{ selector: ".nav-testimonials", content: "Testimonials" },
			{ selector: ".nav-explainers", content: "Explainers" },
			{ selector: ".nav-incubator", content: "Incubator" },
			{ selector: ".nav-careers", content: "Careers" },
		];

		tippy.setDefaultProps({
			placement: "right",
		});

		navItems.forEach((item) => {
			tippy(item.selector, {
				content: item.content,
			});
		});
	});
}

async function loadScript(src) {
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = src;
		script.onload = resolve;
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

function setup_sidebar_toggle() {
	window.addEventListener("DOMContentLoaded", function () {
	    if (!document.querySelector(".frappe-sidebar-toggle")) return
    	document.querySelector(".frappe-sidebar-toggle").onclick = () => {
    	    if (!document.querySelector(".frappe-sidebar-new")) return
    		document.querySelector(".frappe-sidebar-new").style.left = "0px";
    		document.querySelector(".sidebar-backdrop").style.display = "block";
    	};
    	document.querySelector(".sidebar-backdrop").onclick = () => {
    	    if (!document.querySelector(".frappe-sidebar-new")) return
    		document.querySelector(".frappe-sidebar-new").style.left = "-100%";
    		document.querySelector(".sidebar-backdrop").style.display = "none";
    	};
	});
}

function setup_scroll_position_restore() {
	// Restore the scroll position when the page is loaded (standard restoration will not work, since our main scrollable container is not body)
	function wasTraversed() {
		const entries = performance.getEntriesByType("navigation");
		if (entries.length === 0) {
			return false;
		}
		const entry = entries[0];
		return entry.type === "back_forward";
	}

	function wasReloaded() {
		const entries = performance.getEntriesByType("navigation");
		if (entries.length === 0) {
			return false;
		}
		const entry = entries[0];
		return entry.type === "reload";
	}

	window.addEventListener("beforeunload", function () {
		if (wasReloaded() && !window.location.pathname.includes("/blog/")) {
			sessionStorage.removeItem(`scrollPosition:${window.location.pathname}`);
		}
		if (document.querySelector(".body-container")) {
			const scrollPosition = document.querySelector(".body-container").scrollTop;
			sessionStorage.setItem(`scrollPosition:${window.location.pathname}`, scrollPosition);
		}
	});
	window.addEventListener("DOMContentLoaded", function () {
		const savedScrollPosition =
			sessionStorage.getItem(`scrollPosition:${window.location.pathname}`) || 0;

		if (document.querySelector(".body-container") && (wasTraversed() || window.location.pathname.includes("/blog/"))) {
			document.querySelector(".body-container").scrollTop = savedScrollPosition;
		}
	});
}

function setup_thought_of_the_day() {
	window.addEventListener("DOMContentLoaded", function () {
		// quote-of-the-day
		const quotes = [
			'"To err is human, to forgive is design." – Andrew Dillon',
			"The only way to do great work is to love what you do. - Steve Jobs",
			"In the middle of difficulty lies opportunity. - Albert Einstein",
			"The best way to predict the future is to invent it. – Alan Kay",
			"Simplicity is the ultimate sophistication. – Leonardo da Vinci",
			"Your most unhappy customers are your greatest source of learning. – Bill Gates",
			"Do one thing every day that scares you. – Eleanor Roosevelt",
			"The best revenge is massive success. – Frank Sinatra",
			"Whether you think you can, or you think you can't – you're right. – Henry Ford",
			 "It always seems impossible until it's done. – Nelson Mandela",
			 "Do or do not. There is no try. – Yoda",
			 "Design is intelligence made visible. - Alina Wheeler"
		];

		const day_of_year = new Date().getDay();

		// Display the quote for the current day
		const quote_element = document.querySelector(".f-thought em");
		if (quote_element) {
		    quote_element.textContent = quotes[day_of_year % quotes.length];
		}
		
	});
}

function setup_plausible() {
	// plausible
	const script = document.createElement("script");
	script.defer = true;
	script.dataset.api = "https://frappecloud.com/api/event";
	script.dataset.domain = "frappe.io";
	script.src = "https://frappecloud.com/js/script.js";
	document.head.appendChild(script);
}

function setup_navigation_shortcut() {
	document.addEventListener("keydown", function (e) {
		var active = document.querySelector(".nav-link-item[active=true]");
		if (active) {
			var next =
				e.keyCode === 40
					? active.nextElementSibling
					: e.keyCode === 38
					? active.previousElementSibling
					: null;
			// there can be other elements between .nav-link-item
			while (
				next &&
				(next.classList.contains("nav-link-item") === false || next.offsetParent === null)
			) {
				next =
					e.keyCode === 40
						? next.nextElementSibling
						: e.keyCode === 38
						? next.previousElementSibling
						: null;
			}
			if (e.shiftKey && next) {
				next.click();
			}
		}
	});
}

function isMobile() {
	// 	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
	// 	  navigator.userAgent
	// 	);
	return window.matchMedia("(max-width: 767px)").matches;
}

function isTablet() {
	return window.matchMedia("(max-width: 1024px) and (min-width: 768px)").matches;
}

async function loadStyle(src) {
	return new Promise((resolve, reject) => {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = src;
		link.onload = resolve;
		link.onerror = reject;
		document.head.appendChild(link);
	});
}

function setup_posthog() {
    // !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    // posthog.init('phc_PxMKOBaHDGJApbZkYqSVro6YSecTYgQ6tB4BAV2nYmd',{api_host:'https://posthog.frappe.cloud'})
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('phc_zTPkxUE6DsTVNIZem5onI6EHRPu235yo1RFFZLBgvMH',{api_host:'https://onboarding.frappe.cloud', person_profiles: 'identified_only' // or 'always' to create profiles for anonymous users as well
        })
        posthog.set_config({disable_session_recording: true})
}
// --- END https://frappe.io/files/page_scripts/builder-asset-script.js?v=20fae7dd77 ---
