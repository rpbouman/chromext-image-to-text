async function copyToClipboard(message) {
  
  // Oddly enough this is void - so we don't really know if it succeeeded.
  await chrome.offscreen.createDocument({
    url: 'offscreen/document.html',
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: 'Write text extracted from image to the clipboard.'
  });

  var response = await chrome.runtime.sendMessage({
    type: 'copy-data-to-clipboard',
    target: 'offscreen-doc',
    text: message.text
  });
   
}

async function fetchImageAsBase64(srcUrl){
  var response = await fetch(srcUrl);
  var blob = await response.blob();
  var arrayBuffer = await blob.arrayBuffer();
  var uint8Array = new Uint8Array(arrayBuffer);
  var length = uint8Array.length;
  var type = blob.type;
  var base64 = uint8Array.toBase64();
  return {
    length: length,
    type: type,
    base64: base64
  };
}

async function contextMenuClickHandler(info, tab){
  var imageSrcUrl = info.srcUrl;
  var imageData = await fetchImageAsBase64(imageSrcUrl);
  imageData.srcUrl = imageSrcUrl;
  var response = await chrome.tabs.sendMessage(tab.id, {
    type: 'image-to-text',
    image: imageData
  }, {
    frameId: info.frameId
  });
  
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

function initContextMenu(){
  var handler;
  if (typeof LanguageModel === 'undefined') {
    handler = contextMenuFallbackClickHandler
  }
  else {
    handler = contextMenuClickHandler;
  }
    
  chrome.contextMenus.create({
    title: 'Image to text',
    contexts: ['image'],
    id: 'image'
  });
  
  chrome.contextMenus.onClicked.addListener(handler);
}

initContextMenu();