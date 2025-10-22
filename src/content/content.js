var baseModel;
var abortController;

async function fetchImageAsBlob(srcUrl) {
  var response = await fetch(srcUrl);
  var blob = await response.blob();
  return blob;
}

async function getImageData(message){  
  var imageData;
  var srcUrl = message.srcUrl;
  if (message.base64) {
    var array = Uint8Array.fromBase64(message.base64);
    imageData = new Blob([array], {type: message.type});
  }
  else
  if (message.srcUrl){
    imageData = await fetchImageAsBlob(message.srcUrl);
  }
  return imageData;
}

async function getBaseModel(){
  try {
    if (baseModel === undefined){
      baseModel = await LanguageModel.create({
        expectedInputs: [{type: 'image'}],
        initialPrompts: [
          {
            role: 'system', 
            content: [
              'You are an expert at extracting text from images uploaded by the user. If the image is a: ',
              '- screenshot of a bookpage or article then extract the text and use markdown to convey structure and style.',
              '- screenshot of a code editor or IDE, or contains areas like that, then in addition to a general description of the image, return the code in a markdown codeblock.',
              '- photograph, then describe the scene. If it has captions, extract those and describe their placement. If there are items in the scene with text on them, then extract those and metion them in the scene description.',
              '- flag or heraldic emblem, then extract any text. Describe its color, shape and affect. If you can identify a nationality, period, house, order, or family, mention their name(s).',
              '- logo, then extract all text. Describe its color, shape and affect. If you can identify a brand, musical band, company or organization, mention its name.',
              '- diagram, then list its elements. Mention their shape (i.e. rectangle, diamond), color and text labels. If the elements are composite (for example, a table with columns) then nest the list and mention those constituent elements as well. Make a separate list of the relationships between the elements, describing the color and style of the lines connecting them (for example, solid, dashed, etc), and the symbol appearing at the ends of the line that connect to the elements (for example, arrowhead) and mentioning any labels that appear to describethe relationshipt. If the diagram as a whole has a title, then this should precedede the description.',
              '- screenshot of a table, excel worksheet, data grid, or if it contains areas that match such things, then return those tables in a format that would allow them to be easily pasted to Excel.',
              '- graph or chart (i.e a data visualization) then first determine the type of chart, and mention that in the text output. Then identifiy the numbers and units on the axes, and mention them. Then try to identify how any data series are shown, and mention them, describing their color and/or symbol used to plot the data points. Finally, evaluate each series separately, and list each data point, mentioning the values on the respective axes. For continuous graph types like line charts, do it for the smallest tickmarks you can identify along the axes. Make sure the series can be pasted easily to Excel.'
            ].join('\r\n')
          }
        ],
        monitor: function(m){
          m.addEventListener('downloadprogess', async function(e){
            updateDialog({
              progress2: (e.loaded * 1000)
            })
          })
        }
      });
    }
  }
  catch(e) {
    throw e;
  }
  finally {
  }    
  return baseModel;
}

async function getModel(){
  var model;
  try {
    if (baseModel === undefined){
      baseModel = await getBaseModel();
      if (isCancelled()){
        return null;
      }
    }
    if (!abortController){
      abortController = new AbortController();
    }
    model = await baseModel.clone({
      signal: abortController.signal
    });
  }
  catch(e) {
    switch (e.name){
      case 'InvalidStateError':
        switch (e.message){
          case 'The session cannot be cloned.':
            baseModel.destroy();
            baseModel = undefined;
            break;
        }
        break;
    }
    throw e;
  }
  finally {
  } 
  return model;
}

async function copyToClipboard(text){
  navigator.clipboard.writeText(text);
}

function dialogOkButtonClickHandler(){
  setState('idle')
}

function dialogCancelButtonClickHandler(){
  if (abortController){
    abortController.abort();
    abortController = null;
  }
  if (getState() === 'error'){
    setState('idle');
  }
  else {
    setState('cancelled');
  }
}

function isCancelled(){
  return getState() === 'cancelled';
}

function getState(){
  var dialog = getDialog();
  var state = dialog.getAttribute('data-image-to-text-state');
  return state;
}

function setState(newState){
  var dialog = getDialog();
  dialog.setAttribute('data-image-to-text-state', newState);
  if (newState === 'idle'){
    if (dialog.open){
      dialog.close();
    }
  }
  else
  if (!dialog.open){
    dialog.showModal();
  }
}

function createDialog(){
  var id = chrome.runtime.id;

  var dialog = document.createElement('dialog');
  document.body.appendChild(dialog);

  dialog.setAttribute('id', id);
  dialog.setAttribute('class', 'image-to-text');

  var header = document.createElement('header');
  dialog.appendChild(header);

  var img = document.createElement('img');
  img.src = chrome.runtime.getURL('images/icon16x16.png');
  header.appendChild(img);
  
  var span = document.createElement('span');
  span.textContent = 'Image to Text';
  header.appendChild(span);  

/*
  var donationLink = document.createElement('a');
  donationLink.setAttribute('href', 'https://www.paypal.com/donate/?hosted_button_id=776A6UNZ35M84');
  donationLink.setAttribute('target', 'donate');
  donationLink.textContent = 'Donate';
  header.appendChild(donationLink);
*/

  var section = document.createElement('section');
  dialog.appendChild(section);

  var textSpan = document.createElement('span');
  section.appendChild(textSpan);
  
  var progress = document.createElement('progress');
  progress.setAttribute('max', 50);
  section.appendChild(progress);

  var progress2 = document.createElement('progress');
  progress2.setAttribute('max', 100);
  section.appendChild(progress2);

  var outputSpan = document.createElement('span');
  section.appendChild(outputSpan);

  var footer = document.createElement('footer');
  dialog.appendChild(footer);  
  
  var okButton = document.createElement('button');
  okButton.setAttribute('type', 'button');
  okButton.setAttribute('name', 'okButton');
  okButton.textContent = 'Ok';
  okButton.addEventListener('click', dialogOkButtonClickHandler);
  footer.appendChild(okButton);

  var cancelButton = document.createElement('button');
  cancelButton.setAttribute('type', 'button');
  cancelButton.setAttribute('name', 'cancelButton');
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', dialogCancelButtonClickHandler);
  footer.appendChild(cancelButton);

  return dialog;
}

function updateDialog(options){
  var dialog = getDialog();
  
  if (options.state){
    setState(options.state);
  }
  
  var progressElements = dialog.querySelectorAll('section > progress');
  var progress = options.progress;
  if (progress !== undefined) {

    progressElements.item(0).setAttribute('value', progress);
  }

  var progress2 = options.progress2;
  var progressElement2 = progressElements.item(1);
  if (progress2 === undefined) {
    progressElement2.value = 0;
  }
  else {
    progressElement2.value = progress2;
  }

  var message = options.message;
  if (message !== undefined) {
    var messageText = dialog.querySelector('section > span');
    messageText.textContent = message;
  }
  
  var output = options.output;
  if (output !== undefined) {
    var outputText = dialog.querySelector('section > progress + span');
    outputText.textContent = output;
  }
  
  var message = options.message;
}

function getDialog(){
  var id = chrome.runtime.id;
  var dialog = document.getElementById(id);
  if (dialog === null){
    dialog = createDialog();
    setState('idle');
  }
  return dialog;
}

async function imageToText(request){
  var message = '';
  var model;
  try {
    updateDialog({
      state: 'get-image',
      message: 'Getting image',
      progress: '0',
      progress2: '0',
      output: ''
    });
    var imageData = await getImageData(request.image); 
    if (isCancelled()){
      return;
    }
    
    updateDialog({
      state: 'get-model',
      message: 'Getting model',
      progress: '10'
    });    
    model = await getModel(abortController);
    if (isCancelled()){
      return;
    }

    updateDialog({
      state: 'analyzing-image',
      message: 'Analyzing image',
      progress: '20'
    });
    var multiModalPrompt = [{
      role: 'user',
      content: [{type: 'image', value: imageData}]
    }];

    var options = {};
    if (request.userPrompt) {
      var userPrompt = request.userPrompt;
      multiModalPrompt[0].content.push({
        type: 'text',
        value: userPrompt.userPrompt
      });
      if (userPrompt.responseConstraint) {
        options.responseConstraint = userPrompt.responseConstraint;
      }
    }
    
    var responseStream = await model.promptStreaming(
      multiModalPrompt,
      options
    );
    if (isCancelled()){
      return;
    }

    var progress2 = 0;
    updateDialog({
      state: 'waiting-for-output',
      message: 'Waiting for output',
      progress: '30',
      progress2: progress2
    });    
    for await (var chunk of responseStream) {
      message += chunk;
      if (progress2 === 0){
        updateDialog({
          state: 'generating-output',
          progress: '40',
        });
      }

      progress2 = progress2 === 100 ? 1 : progress2 + 1;
      updateDialog({
        output: message.slice(message.length - 40),
        progress2: progress2
      });
      if (isCancelled()){
        message += '\r\n\r\nABORTED AT USER REQUEST';
        return message;
      }
    }
    updateDialog({
      state: 'ready',
      message: 'Output copied to clipboard',
      progress: '50',
      output: ''
    });
  }
  catch (e){
    _errorName: switch (e.name){
      case 'NotAllowedError':
        switch(e.message){          
          case 'Model capability is not available.':
            updateDialog({
              state: 'error',
              message: 'Multi-Modal capability unavailable.',
              progress: '50', // todo: derive from max
              output: 'Troubleshooting tips copied to clipboard.'
            });
            message = [
              '- Navigate to: chrome://flags/#prompt-api-for-gemini-nano-multimodal-input',
              '- Enable the multi-modal capability of the Prompt API',
              '- Restart chrome and try again.',
            ].join('\r\n');
            break _errorName;
          default:
        }
        break;
      case 'UnknownError':
        switch (e.message){
          case 'Other generic failures occurred.':
            updateDialog({
              state: 'error',
              message: 'Unexpected Error: Model crashed.',
              progress: '50', // todo: derive from max
              output: 'Troubleshooting tips copied to clipboard.'
            });
            message = [
              `The model threw "${e.name}: ${e.message}".`,
              '',
              `In general this indicates a "Model crash", i.e. some sort of unrecoverable internal error.`,
              '',
              'To troubleshoot, navigate to: chrome://on-device-internals/',
              '- Check the "Event Logs" tab. If a log is present, then create a bug report against google chrome and include the log.',
              '- Reset the crash count in the "Model Status" tab, and restart chrome.',
            ].join('\r\n');
            break _errorName;
          default:
        }
      default:
        updateDialog({
          state: 'error',
          message: e.name,
          progress: '50', // todo: derive from max
          output: e.message
        });
        throw e;
    }
  }
  finally {
    try {
      if (model) {
        abortController = null;
        model.destroy();
      }
    }
    catch(e){
      console.error(e);
    }
    var state = getState();
    if (['ready', 'error'].indexOf(state) === -1){
      setState('idle');
    }
  }
  return message;  
}

function getContextMenuElementInfo(){
  var nodeType = contextMenuElement.nodeType;
  var nodeName = contextMenuElement.nodeName;
  var elementInfo = {
    nodeType: nodeType,
    nodeName: nodeName
  };
  if (nodeType === contextMenuElement.ELEMENT_NODE){
    var attributes = {};
    var attributeNames = contextMenuElement.getAttributeNames();
    for (var i = 0; i < attributeNames.length; i++){
      var attributeName = attributeNames[i];
      attributes[attributeName] = contextMenuElement.getAttribute(attributeName);
    }
    elementInfo.attributes = attributes;
    var computedStyle = getComputedStyle(contextMenuElement);
    elementInfo.computedStyle = computedStyle;
  }
  return elementInfo;
}

// note:
// having an async handler needs some tricky syntax to work in such a way that the message sender 
// (background script in this case)
// can actually await the response.
// see:
// https://stackoverflow.com/questions/48107746/chrome-extension-message-not-sending-response-undefined
//
function handleMessage(message, sender, sendResponse) {
  var proxyHandler = async function(sendResponse){
    var response = {
      type: message.type,
    }
    switch (message.type){
      case 'ping':
        response.response = 'pong';
        break;
      case 'alert':
        alert(message.text);
        break;
      case 'element-info':
        response.elementInfo = getContextMenuElementInfo();
        break;
      case 'image-to-text':
        var image = message.image;
        var srcUrl = image.srcUrl;
        response.image = {
          srcUrl: srcUrl
        };
        try {
          var text = await imageToText(message);
          response.text = text;
          response.success = true;
        }
        catch (e) {
          response.errorType = e.name;
          response.errorMessage = e.message;
        }
        break;
    }
    sendResponse(response);
  };
  
  proxyHandler(sendResponse);
  return true;
}

var contextMenuElement;
async function contextMenuHandler(event){
  contextMenuElement = event.target;
}

chrome.runtime.onMessage.addListener(handleMessage);
document.addEventListener('contextmenu', contextMenuHandler);
