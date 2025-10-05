# chromext-image-to-text
![Image to Text icon](src/images/icon128x128.png?raw=true) A google chrome extension to extract text from images appearing in webpages. The extension installs a context menu item that is available on any image. Clicking the context menu item pops up a dialog that informs you of the progress. After analyzing the picture, a text is copied to the clipboard so it may be used in other applications.

## Installation

To install this chrome extension, you can checkout or downoad this repository and follow the standard procedure for installing an unpacked chrome extension.
This process is described here: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world
The src folder of this project should be used as extension folder.

## Description

This google chrome extension lets you turn any image, on any webpage into text. 
- If it's a picture or painting, it will be a description that describes what can be seen; 
- if it's a screenshot from an application, it will extract the text; 
- if it's a diagram it will list the elements and relationships; 
- if it's a chart or a graph it will give you the data (well, sort of). 
