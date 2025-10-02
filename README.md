# chromext-image-to-text
This extension provides a context menu item for images appearing on webpages. 
When activatied, the image is analyzed by a `LanguageModel` (see: https://developer.chrome.com/docs/ai/prompt-api).
The result of the analysis is streamed from the model and copied to the clipboard.


When activated, a `LanguageModel`  is instantiated with a system prompt that instructs the model to analyze images uploaded by the user.
The image is then offered as prompt. The output is then streamed and buffered, and finally copied to the clipboard, so it can be further used in other applications.

After clicking the context menu item, a (modal) dialog pops up to inform the user of the progress.

# Installation
1) Download or clone this repo.
2) In google chrome, open the Manage Extensions page (menu > Extensions > Manage Extensions).
3) In the extension manager page, click the "Load Unpacked" button.
4) The filebrowser opens. Browse to the `src` folder, select it, and choose "Select Folder"

That's it!

# Description
The extension attempts to extract different bits of information depedning on the kind of image:
- for paintings and artwork, it will generate a description of the scene. Any texts appearing in the image wil be extracted and appear in the description
- screenshots of code or pages from a book are typically extracted in full, and there may be some descriptive text to explain the context
- for diagrams, like flow charts, an attempt is made to extract a list of elements describing their shapes, colors, and any text labels; A list of the relationships between these elements is also extracted.
- for screenshots of data grids and spreadsheets, the data shoudl be extracted and returned as text in a tabular format. 
