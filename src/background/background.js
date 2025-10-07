async function doOffscreenRequest(request) {  
  var docData = {
    url: request.url || 'offscreen/document.html',
    reasons: request.reasons,
    justification: request.justification
  };

  await chrome.offscreen.createDocument(docData);
  
  var message = {
    type: request.type,
    target: docData.url,
    payload: request.payload
  }
  
  var response = await chrome.runtime.sendMessage(message);
  if (response.error){
    throw new Error('response.error');
  }
  return response;
}

async function copyToClipboard(text) {
  var request = {
    type: 'copy-data-to-clipboard',
    payload: text,
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: 'Write text extracted from image to the clipboard.'
  }
  var response = await doOffscreenRequest(request);
  return response;
}

async function renderImage(srcUrl){
  var request = {
    type: 'render-image',
    payload: {
      srcUrl: srcUrl
    },
    reasons: [chrome.offscreen.Reason.BLOBS],
    justification: 'Need to render svg images in order to get image data the model can interpret.'
  }
  var response = await doOffscreenRequest(request);
  return response.response;
}

async function fetchImageAsBase64(srcUrl){
  var response = await fetch(srcUrl);
  var headers = response.headers;
  var contentType = headers.get('Content-Type');

  var base64;  
  if (contentType && /^image\/svg\+xml\b/.test(contentType)){
    var text = await response.text();
    var dataUrl = 'data:image\/svg+xml,' + encodeURIComponent(text);
    var imageData = await renderImage(dataUrl);
    base64 = imageData.base64;
    contentType = imageData.type;
  }
  else {
    var blob = await response.blob();
    var arrayBuffer = await blob.arrayBuffer();
    var uint8Array = new Uint8Array(arrayBuffer);
    base64 = uint8Array.toBase64();
  }
  return {
    type: contentType,
    base64: base64
  };
}

function contextMenuClickHandler(info, tab){
  
  var proxyHandler = async function(info, tab) {
    var imageSrcUrl = info.srcUrl;
    var imageData;
    
    try {
      imageData = await fetchImageAsBase64(imageSrcUrl);
    }
    catch (e){
      await chrome.tabs.sendMessage(tab.id, {
        type: 'alert',
        text: [
          'Error acquiring the image: ',
          '',
          `${e.name}: ${e.message}`
        ].join('\r\n')
      });
      return;
    }
    
    imageData.srcUrl = imageSrcUrl;
    var request = {
      type: 'image-to-text',
      image: imageData
    };
    var requestOptions = {
      frameId: info.frameId
    };
      
    var response;
    response = await chrome.tabs.sendMessage(tab.id, request, requestOptions);
    var textForClipboard;
    if (response.success === true) {
      textForClipboard = [
        'Page: ' + tab.url,
        'Image: ' + imageSrcUrl,
        '',
        response.text
      ].join('\r\n');
    }
    else {
      textForClipboard = [
        'Page: ' + tab.url,
        'Image: ' + imageSrcUrl,
        '',
        'Error: ' + response.errorType,
        'Message: ' + response.errorMessage
      ].join('\r\n');
    }
    copyToClipboard({
      text: textForClipboard
    });
  }
  proxyHandler(info, tab);
}

function contextMenuFallbackClickHandler(info, tab){
  var proxHandler = async function(info, tab){
    var flagUrl = 'chrome://flags/#prompt-api-for-gemini-nano-multimodal-input';
    copyToClipboard({
      text: flagUrl
    });
    var response = await chrome.tabs.sendMessage(tab.id, {
      type: 'alert',
      text: [
        'LanguageModel not found.',
        'To fix the issue, navigate to the enable "Promt API for Gemini mini" flag and enable it.',
        'For your convenience, this flag has been copied to the clipbaord.',
      ].join('\r\n')
    });
  }
  proxHandler(info, tab);
}

// install the context menu item (only once)
chrome.runtime.onInstalled.addListener(function(){
  var contextMenuItemId = chrome.runtime.id + '_contextmenuitem';
  chrome.contextMenus.create({
    title: 'Image to text',
    contexts: ['image'],
    id: contextMenuItemId
  });  
});

// register a listener for the context menu.
// DO NOT MOVE THIS CODE INSIDE A FUNCTION - LEAVE THIS HERE AT THE TOP LEVEL
// You might thing the natural place to register the handler would be once, where the context menu is created.
// Unfortunately, that is wrong. 
// The reason is that the context menu is created globally and only once for a browser session.
// The handler for the context many needs to be registered every time the background script is loaded.
// The browser is quick to evict this background script in case it is not being user (i.e. actively handling events)
chrome.contextMenus.onClicked.addListener(
  typeof LanguageModel === 'undefined' 
  ? contextMenuFallbackClickHandler 
  : contextMenuClickHandler
);


