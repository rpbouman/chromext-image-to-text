# chromext-image-to-text
<img alt="Image to Text icon" src="src/images/icon128x128.png?raw=true" align=left/> A google chrome extension to extract text from images appearing in webpages. The extension installs a context menu item that is available on any image. Clicking the context menu item pops up a dialog that informs you of the progress. After analyzing the picture, a text is copied to the clipboard so it may be used in other applications.

<img width="1280" height="800" alt="image-to-text" src="https://github.com/user-attachments/assets/15b05848-6811-484f-9bb8-fb17671670db" />

In addition to the generic Image-to-Text option, you can also create and maintain your own custom prompts from the extension's option page. These will be persisted and appear as subitems of the Image-to-Text contextmenu:

<img width="983" height="594" alt="image" src="https://github.com/user-attachments/assets/6438d95b-8f49-4ee0-b254-51bafdc635c3" />

Finally, this repository also hosts an online library of prompts that you can add to your personal collection, also from the options page:

<img width="983" height="434" alt="image" src="https://github.com/user-attachments/assets/ec76254b-47e9-45ea-a76f-ae32834fc27a" />

To see it in action, checkout this demo video on Youtube: https://www.youtube.com/watch?v=0w4jdvy7ZAg

## Installation

You can either install this plugin from a local copy of this repository, or you can [get it from the Chrome Web store](https://chromewebstore.google.com/detail/ffalgjfbpcafmoggapmobefdhgbkmang?utm_source=item-share-cb).

### Local installation
1) Checkout this repository: https://github.com/rpbouman/chromext-image-to-text.git This is the recommended route if you want to explore the code and/or contribute. Alternatively, you can download and then unzip a snapshot: https://github.com/rpbouman/chromext-image-to-text/archive/refs/heads/dev.zip  
2) Follow the standard procedure for installing an unpacked chrome extension. This process is described here: [https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) Use the src directory as plugin directory. 

#### Loading an unpacked extension
For your convenience, the process for loading an unpacked extension is given here as well. If you run into any issue following the instructions below then please review [Google Chrome's official documentation for loading an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).
1) Open the manage extensions page: chrome://extensions/ You can also do this by choosing the "Manage Extensions" menu item, either by clicking the Jigsaw icon right of the omnibox, or through the menu Settings > Extensions > Manage Extensions
2) At the top of the "Manage Extensions" page is a "Load Unpacked"-button. Click it.
3) You'll be prompted to select a folder. Choose the "src" folder which is in the root folder of this repo.

### Chrome Webstore installation
1) Open this extension's page in the Chrome Web Store: [https://chromewebstore.google.com/detail/ffalgjfbpcafmoggapmobefdhgbkmang](https://chromewebstore.google.com/detail/ffalgjfbpcafmoggapmobefdhgbkmang?utm_source=item-share-cb). Alternatively, search for ["Image-to-Text Contextmenu"](https://chromewebstore.google.com/search/Image-to-Text%20Contextmenu) using the [Chrome Web Store's search](https://chromewebstore.google.com/search) feature, and click the result
2) Click the "Add to Chrome" button. A dialog might pop up saying: "Proceed with caution. This extension is not trusted by Enahanced Safe Browsing". Confirm it by clicking "Continue to Install".

That's it! Oh, if you're wondering about the cautionary popup when installing the plugin: the extension requires a couple of permissions that indeed are a cause for security concerns:
- The extension has the permission to fetch data from any domain to overcome the same origin policy. Without this permission, many sites will not allow you to grab their images which would pretty severely limit the usefulness of the extension 
- The extension creates a dialog to inform you of the process. This dialog is rendered inside the page from where you right clicked on the image, thereby altering it.

The way these features are used by this extension should be totally safe. But the permissions themselves would obviously also allow malicious extensions to steal you data, impersonate you, etc.

If you still have doubts, then perhaps you might feel comfortable by downloading this repository, reviewing the code for yourself and then install locally. 

# Description

This google chrome extension lets you turn any image, on any webpage into text. 
- If it's a picture or painting, it will be a description that describes what can be seen; 
- if it's a screenshot from an application, it will extract the text; 
- if it's a diagram it will list the elements and relationships; 
- if it's a chart or a graph it will give you the data (well, sort of). 
