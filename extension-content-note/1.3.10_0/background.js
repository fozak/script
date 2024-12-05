(function () {
	'use strict';

	chrome.action.onClicked.addListener((e=>{e.id&&chrome.tabs.sendMessage(e.id,{toggleVisible:!0});})),chrome.tabs.onActivated.addListener((function(e){(null==e?void 0:e.tabId)&&chrome.tabs.sendMessage(null==e?void 0:e.tabId,{updateStorage:!0});}));

}());
