# Cardflo Backend (Google Apps Script)

Copy and paste the following code into your Google Apps Script editor (Extensions > Apps Script in Google Sheets).

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getActiveSheet();
    
    // Parse the incoming JSON data
    var data = JSON.parse(e.postData.contents);
    
    // Prepare the row data
    // Order: Timestamp, First Name, Last Name, Job Title, Company, Email, Phone, Website, Address, Notes
    var newRow = [
      new Date(),
      data.firstName || "",
      data.lastName || "",
      data.jobTitle || "",
      data.company || "",
      data.email || "",
      data.phone || "",
      data.website || "",
      data.address || "",
      data.notes || ""
    ];

    // Append the row to the sheet
    sheet.appendRow(newRow);

    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "success", "row": sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  catch (e) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "error", "error": e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  finally {
    lock.releaseLock();
  }
}

function setup() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = ["Timestamp", "First Name", "Last Name", "Job Title", "Company", "Email", "Phone", "Website", "Address", "Notes"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  sheet.getRange(1, 1, 1, headers.length).setBackground("#d1e7dd"); // Light emerald header
}
```

## Setup Instructions

1.  Open your Google Sheet.
2.  Go to **Extensions > Apps Script**.
3.  Paste the code above into `Code.gs`.
4.  Run the `setup()` function once to create headers.
5.  Click **Deploy > New deployment**.
6.  Select type: **Web app**.
7.  Description: "Cardflo V1".
8.  Execute as: **Me**.
9.  Who has access: **Anyone** (Important for the app to post data without OAuth flow).
10. Copy the **Web App URL** and use it in the Cardflo setup screen.
