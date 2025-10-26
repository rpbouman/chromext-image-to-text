function getSidebarItems(){
  var sidebarItems = document.getElementById('sidebarItems');
  return sidebarItems;
}

function getLibraryPrompts(){
  var libraryPrompts = document.getElementById('libraryPrompts');
  return libraryPrompts;
}

function updateForm(item){
  var currentItemForm = document.getElementById('currentItemForm');
  var currentItemFormElements = currentItemForm.elements;
  for (var property in item){
    var currentItemFormElement = currentItemFormElements[property];
    if (!currentItemFormElement){
      continue;
    }
    
    var value = item[property];
    if (currentItemFormElement.name === 'responseConstraint'){
      currentItemFormElement.value = value;
      validateResponseConstraint(currentItemFormElement);
    }
    else {
      currentItemFormElement.value = value;
    }
  }
  setFormStateDirty(false);
}

function getFormData(){
  var currentItemForm = document.getElementById('currentItemForm');
  var currentItemFormElements = currentItemForm.elements;
  var item = {};
  for (var element in currentItemFormElements) {
    var currentItemFormElement = currentItemFormElements[element];
    var value;
    switch (currentItemFormElement.tagName) {
      case 'BUTTON':
      case 'OUTPUT':
        continue;
      case 'TEXTAREA': 
        if (currentItemFormElement.name === 'responseConstraint') {
          value = currentItemFormElement.value.trim();
          if (value.length) {
            value = JSON.parse(currentItemFormElement.value);
          }
          else {
            value = undefined;
          }
          break;
        }
      case 'INPUT':
      default:
        value = currentItemFormElement.value;
        break;
    }
    if(!currentItemFormElement.name === 0){
      debugger;
    }
    item[currentItemFormElement.name] = value;
  }
  return item;
}

async function sidebarItemChangeHandler(event){
  var input = event.target;
  if (!input.checked) {
    return;
  }
  var id = input.id;
  var item = await getItem(id);
  updateForm(item);
}

function getCurrentItemId(){
  var currentItem = getCurrentSidebarItem();
  var input = currentItem.querySelector('input[type=radio]');
  var id = input.id;
  return id;
}

function getCurrentSidebarItem(){
  var sidebarItems = document.getElementById('sidebarItems');
  var item = sidebarItems.querySelector('li:has( > input[type=radio]:checked)');
  return item;
}

function updateCurrentSidebarItemFromForm(){
  var sidebarItem = getCurrentSidebarItem();
  var currentItemForm = document.getElementById('currentItemForm');
  sidebarItem.querySelector('label').textContent = currentItemForm['name'].value;
  var iconSrc = '../images/icon16x16.png';
  sidebarItem.querySelector('img').src = iconSrc;
}

function instantiateSidebarItem(id){
  var sidebarItemTemplate = document.getElementById('sidebarItem');
  var sidebarItem = sidebarItemTemplate.content.cloneNode(true);
  var label = sidebarItem.querySelector('label');
  var input = sidebarItem.querySelector('input[type=radio]');
  input.addEventListener('change', sidebarItemChangeHandler)
  input.setAttribute('id', id);
  label.setAttribute('for', id);
  return sidebarItem;
}

function addSidebarItem(sidebarItemsContainer, promptInfo, selected) {
  var sidebarItem = instantiateSidebarItem(promptInfo.id);
  sidebarItemsContainer.appendChild(sidebarItem);
  sidebarItems = sidebarItemsContainer.getElementsByTagName('li');
  sidebarItem = sidebarItems[sidebarItems.length - 1];
  
  var label = sidebarItem.querySelector('label');
  label.textContent = promptInfo.name;
  var icon = sidebarItem.querySelector('img');
  var src = promptInfo.icon;
  if (!src){
    src = '../images/icon16x16.png';
  }
  icon.src = src;
  
  var radio = sidebarItem.querySelector('input[type=radio]');
  radio.name = sidebarItemsContainer.id + '_itemSelection'
  if (selected === true) {
    radio.click();
    updateForm();
    document.getElementById('name').select();
    document.getElementById('name').focus();
  }
  
  return sidebarItem;
}

async function getPromptsFromStorage(){
  var needsStorage = false;
  var prompts = await chrome.storage.local.get('prompts');
  if (!prompts.prompts){
    prompts.prompts = {};
    needsStorage = true;
  }
  if (!prompts.prompts.list){
    prompts.prompts.list = [];
    needsStorage = true;
  }
  if (needsStorage){
    await chrome.storage.local.set(prompts);
  }
  var list = prompts.prompts.list;
  return list;
}

async function storePromptsToStorage(prompts){
  await chrome.storage.local.set({
    prompts: {
      list: prompts
    }
  });
  await chrome.runtime.sendMessage({
    type: 'create-context-menus'
  });
}

async function loadOptions(event){
  var sidebarItems = getSidebarItems();
  sidebarItems.innerHTML = '';
  var prompts = await getPromptsFromStorage();
  var firstSidebarItem;
  for (var i = 0; i < prompts.length; i++){
    var promptInfo = prompts[i];
    addSidebarItem(sidebarItems, promptInfo);
  }
}

function getNewItemId(){
  return crypto.randomUUID();
}

async function addNewClickedHandler(event){
  var newItem = {
    id: getNewItemId(),
    name: 'New prompt',
    icon: '',
    prompt: '',
    responseConstraint: ''
  };
  await addNewItem(newItem);
}

async function cloneCurrentClickedHandler(){
  var id = getCurrentItemId();
  var item = await getItem(id);
  var newItem = Object.assign({}, item, {
    id: getNewItemId()
  });
  await addNewItem(newItem);
}

async function addNewItem(newItem){
  var prompts = await getPromptsFromStorage();
  prompts.push(newItem);
  await storePromptsToStorage(prompts);
  addSidebarItem(getSidebarItems(), newItem, true);
}

async function findItemIndex(id){
  var prompts = await getPromptsFromStorage();
  var index = prompts.findIndex(function(item){
    return item.id === id;
  }); 
  return index;
}

async function getItem(id){
  var index = await findItemIndex(id);
  if (index === -1) {
    return undefined;
  }
  var prompts = await getPromptsFromStorage();
  var item = prompts[index];
  return item;
}

async function deleteCurrentClickedHandler(event){
  var currentSidebarItem = getCurrentSidebarItem();
  if (!currentSidebarItem){
    return;
  }
  var id = currentSidebarItem.querySelector('input[type=radio]').id;
  var prompts = await getPromptsFromStorage();
  var index = findItemIndex(id);
  if (index !== -1){
    prompts.splice(index, 1);
    await storePromptsToStorage(prompts);
  }
  var sidebar = currentSidebarItem.parentNode;
  sidebar.removeChild(currentSidebarItem);
}

async function restoreCurrentClickedHandler(event){
  var id = getCurrentItemId();
  var item = await getItem(id);
  updateForm(item);
  updateCurrentSidebarItemFromForm();
}

async function saveCurrentClickedHandler(event){
  var id = getCurrentItemId();
  var index = await findItemIndex(id);  
  var prompts = await getPromptsFromStorage();
  prompts[index] = getFormData();
  await storePromptsToStorage(prompts);
  setFormStateDirty(false);
}

function setFormStateDirty(state){
  var currentItemForm = document.getElementById('currentItemForm');
  currentItemForm.setAttribute('data-dirty', Boolean(state));  
}

function validateResponseConstraint(textarea){
  var value = textarea.value;
  value = value.trim();
  var validityState = '';
  if (value.length) {
    try {
      var jso = JSON.parse(value);
    }
    catch (e) {
      validityState = e.message;
    }
  }
  textarea.setCustomValidity(validityState);
}

function formChangedHandler(event){
  setFormStateDirty(true);
  
  var target = event.target;
  var currentItem = getCurrentSidebarItem();
  switch (target.id) {
    case 'name':
    case 'id':
      updateCurrentSidebarItemFromForm();
      break;
    case 'responseConstraint':
      validateResponseConstraint(target);
      break;
    default:
  }
}

var baseModel = undefined;
async function getBaseModel(){
  if (baseModel) {
    return baseModel;
  }
  if (typeof LanguageModel === 'undefined'){
    alert([
      `LanguageModel API not defined!`,
      `Be sure to enable the chrome://flags/#prompt-api-for-gemini-nano flag.`
    ].join('\r\n'));
    return undefined;
  }
  var availability = await LanguageModel.availability();
  if (availability === 'unavailable') {
    alert([
      `LanguageModel API is defined, but the model is not available!`
    ].join('\r\n'));
    return undefined;
  }
  baseModel = await LanguageModel.create({
    initialPrompts: [
      {
        role: 'system', 
        content: [
          'You are an expert at analyzing natural language descriptions of image processing and analysis requirements.',
          'You will analyze the user\'s requirements and respond by writing a JSON schema that describes the structure and content of the image analysis as described by the user.',
          'If the user input does not appear to give any specific clues that have to do with image processing, then suggest a generic JSON schema that captures common attribtes that may be applicable to images.',
          'Respond with the JSON schema and only the JSON schema. Do not describe, explain or makrup the schema. Do not wrap the schema in markdown. Just output bare JSON.'
        ].join('\r\n')
      }
    ],
    monitor(m){
      m.addEventListener('downloadprogress', function(e){
        var progress = e.loaded;
        var busy = progress === 1 ? false : true;
        document.getElementById('generateJsonSchema').setAttribute('aria-busy', busy);
        progress = Math.round(progress * 100);
        var downloadProgressElement = document.getElementById('dowloadProgress');
        downloadProgressElement = progress + '%';
      });
    }
  });
  return baseModel;
}

async function getModel(){
  var baseModel = await getBaseModel();
  var clone = await baseModel.clone();
  return clone;
}

async function generateJsonSchemaClickedHandler(event){
  var model = await getModel();
  var promptElement = document.getElementById('prompt');
  var promptText = promptElement.value;
  promptText = promptText.trim();
  if (!promptText.length) {
    promptText = [
      `Write a JSON schema that captures generic aspects of image data uploaded by the user.`,
      `Aspects may extend into various domains:`,
      `- purely technical (pixel dimensions, color model, image format etc)`,
      `- categorical and semi-exact, like image type (illustration, photo, diagram, etc), picture size (small, medium, large), artistic genre`, 
      `- semantical, like whether it is a cartoon, an informative illustration or a realistic representation of reality`,
      `Keep in mind that you only have image data. Don't design attributes that require metadata that cannot be extracted or derived from the image data itself.`,
      `For example, path or url of the source of the picture is something you generally cannot derive from the image data itself.`,
      `Try to capture these in properties of which the values can be meaningfully enumerated in a not too long list of possible values`,
      `Prefer to define attributes as required`
    ].join('\r\n');
  }

  var responseConstraintElement = document.getElementById('responseConstraint');
  responseConstraintElement.value = '';
  var responseStream = await model.promptStreaming([{
    role: 'user',
    content: promptText
  }], {
    responseConstraint: {
      "type": "object"
    }
  });
  var response = '';
  for await (var chunk of responseStream) {
    response += chunk;
    responseConstraintElement.value = response;
    responseConstraintElement.scrollTop = responseConstraintElement.scrollHeight;
  }
  validateResponseConstraint(responseConstraintElement);
}

function downloadURL(url, fileName) {
  var a;
  a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.style = 'display: none';
  a.click();
  a.remove();
}

function downloadBlob(data, fileName, mimeType, timeout) {
  var blob, url;
  blob = new Blob(
    [data]
  , {type: mimeType}
  );
  url = window.URL.createObjectURL(blob);
  downloadURL(url, fileName);
  timeout = timeout === undefined ? 1000 : timeout;
  setTimeout(function() {
    return window.URL.revokeObjectURL(url);
  }, timeout);
}

async function exportPromptsClickedHandler(event){
  var prompts = await getPromptsFromStorage();
  var json = JSON.stringify(prompts, null, 2);
  downloadBlob(json, 'image-to-text-prompts.json', 'application/json');
}

async function importPromptsClickedHandler(event){
  var fileInput = document.getElementById('importPromptsFile');
  fileInput.click(event);
}

function validatePrompt(prompt){
  var validatedPrompt = {};
  if (prompt.id) {
    var id = prompt.id.toLowerCase();
    if(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(prompt.id)){
      return `Invalid id. Expected UUID v4, got "${id}"`;
    }
    validatedPrompt[id] = id;
  }
  else {
    validatedPrompt[id] = crypto.randomUUID();
  }
  
  if (!prompt.name || prompt.name.length === 0){
    return 'Prompt must have a name.';
  }
  validatedPrompt.name = prompt.name.trim();
  
  var promptText = prompt.prompt;
  if (promptText){
    if (! typeof promptText === 'string'){
      return 'Prompt should be a string.';
    }
    promptText = promptText.trim();
    validatedPrompt.prompt = promptText;
  }
  else {
    validatedPrompt.prompt = '';
  }
  
  var responseConstraint = prompt.responseConstraint;
  if (responseConstraint){
    switch (responseConstraint) {
      case 'string':
        responseConstraint = responseConstraint.trim();
        if (responseConstraint.length){
          return `ResponseConstraint should be an empty string or an object, got ${responseConstraint}`
        }
        break;
      case 'object':
        break;
      default:
          return `ResponseConstraint should be an empty string or an object, got ${responseConstraint}`
    }
    validatedPrompt.responseConstraint = responseConstraint;
  }
  return true;
}

async function importPromptsFileChangedHandler(event){
  var target = event.target;
  var files = target.files;
  var errors = [];
  var importedPrompts = [];
  for (var i = 0; i < files.length; i++){
    var file = files[i];
    var text = await file.text();
    var obj = undefined;
    try {
      var obj = JSON.parse(text);
      var type = typeof obj;
      
      if (type !== 'object'){
        throw new Error(`Expected array or object, got ${type}`);
      }
      
      if (obj instanceof Array){
        importedPrompts = obj;
      }
      else {
        importedPrompts = [obj];
      }
      
      importedPrompts = importedPrompts.filter(function(prompt, index){
        var validationResult = validatePrompt(prompt);
        if (validationResult === true) {
          return true;
        }          
        var error = errors[i];
        if (!error){
          error = errors[i] = {
            file: e,
            promptErrors: []
          }
          errors.promptErrors.push({
            prompt: prompt,
            index: index,
            error: validationResult
          });
        }
        return false;
      });
      
      importedPrompts = [].concat(importedPrompts, obj);
    }
    catch (e){
      errors[i] = {
        file: file,
        fileError: e
      };
    } 
  } 
  
  var existingPrompts = await getPromptsFromStorage();
  
  var newPrompts = [].concat(existingPrompts, importedPrompts);
  await storePromptsToStorage(newPrompts);
  loadOptions();
}

var promptLibraryRepoUrl = 'https://api.github.com/repos/rpbouman/chromext-image-to-text/contents/prompts'
async function initPromptLibrary(){
  try {
    var response = await fetch(promptLibraryRepoUrl);
    if (response.status !== 200){
      return;
    }
    var data = await response.json();
    var libraryPrompts = getLibraryPrompts();
    for (var i = 0; i < data.length; i++){
      var libraryPrompt = data[i];
      addSidebarItem(libraryPrompts, {
        id: libraryPrompt.name,
        name: libraryPrompt.name
      });
    }
  }
  catch(e){
  }
}

document.getElementById('name').addEventListener('input', formChangedHandler);
document.getElementById('prompt').addEventListener('input', formChangedHandler);
document.getElementById('responseConstraint').addEventListener('input', formChangedHandler);

document.getElementById('addNew').addEventListener('click', addNewClickedHandler);
document.getElementById('exportPrompts').addEventListener('click', exportPromptsClickedHandler);
document.getElementById('importPrompts').addEventListener('click', importPromptsClickedHandler);
document.getElementById('importPromptsFile').addEventListener('change', importPromptsFileChangedHandler);
document.getElementById('saveCurrent').addEventListener('click', saveCurrentClickedHandler);
document.getElementById('cloneCurrent').addEventListener('click', cloneCurrentClickedHandler);
document.getElementById('deleteCurrent').addEventListener('click', deleteCurrentClickedHandler);
document.getElementById('restoreCurrent').addEventListener('click', restoreCurrentClickedHandler);
document.getElementById('generateJsonSchema').addEventListener('click', generateJsonSchemaClickedHandler);
document.addEventListener('DOMContentLoaded', loadOptions);
initPromptLibrary();