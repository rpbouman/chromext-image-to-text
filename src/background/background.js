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
  if (contentType.startsWith('image\/svg+xml;')){
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

async function injectScriptIntoTab(tabId){
  await chrome.scripting.executeScript({
    target: {tabId: tabId},
    files: ['content/content.js']
  });
  await chrome.scripting.insertCSS({
    target: {tabId: tabId},
    files: ['content/content.css']
  });
  
}

async function contextMenuClickHandler(info, tab){
  var imageSrcUrl = info.srcUrl;
  var imageData = await fetchImageAsBase64(imageSrcUrl);
  imageData.srcUrl = imageSrcUrl;
  
  var request = {
    type: 'image-to-text',
    image: imageData
  };
  var requestOptions = {
    frameId: info.frameId
  };
    
  var response;
  try {
    response = await chrome.tabs.sendMessage(tab.id, {type: 'ping'}, requestOptions);
    if (!response || response.response !== 'pong') {
      throw new Error(`Content script didn't respond to ping request`);
    }
  }
  catch(e){
    switch (e.message){
      case 'Could not establish connection. Receiving end does not exist.':
        await injectScriptIntoTab(tab.id);
        break;
    }
  }
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

async function contextMenuFallbackClickHandler(info, tab){
  var flagUrl = 'chrome://flags/#prompt-api-for-gemini-nano-multimodal-input';
  copyToClipboard({
    text: flagUrl
  });
  var response = await chrome.tabs.sendMessage(tab.id, {
    type: 'alert-no-language-model'
  });
}

async function initContextMenu(){
  var handler;
  if (typeof LanguageModel === 'undefined') {
    handler = contextMenuFallbackClickHandler
  }
  else {
    handler = contextMenuClickHandler;
  }
  
  var contextMenuItemId = chrome.runtime.id + '_contextmenuitem';
  
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    title: 'Image to text',
    contexts: ['image'],
    id: contextMenuItemId
  });
  
  chrome.contextMenus.onClicked.addListener(handler);
}

initContextMenu();