# AQUAVIORA Project

This project is a web application for AQUAVIORA, a premium private-label water bottle brand. It includes a Node.js/Express backend connected to MongoDB and serves a static frontend.

## Prerequisites

Before running the project, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) (Ensure the MongoDB service is running locally)

## Installation

1.  **Clone the repository** (if you haven't already):
    ```bash
    git clone <repository-url>
    cd BOTTELS
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

## Configuration

### Environment Variables
The application uses default values if no `.env` file is present. 
- Port: `5000`
- MongoDB URI: `mongodb://localhost:27017/aquaviora`

To override these, create a `.env` file in the `server` directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/aquaviora
```

### Google Sheets Integration (Optional)
The application supports syncing orders and enquiries to Google Sheets.
1.  Place your `credentials.json` file (Service Account Key) in the project root directory (one level above `server`).
2.  Update the `SPREADSHEET_ID` in `server/services/googleSheets.js` with your Google Sheet ID.
3.  If `credentials.json` is missing, this feature will be skipped automatically.

## Running the Application

### Development Mode
To run the server with `nodemon` (auto-restart on changes):
```bash
npm run dev
```

### Production Mode
To run the server normally:
```bash
npm start
```

## Accessing the Application
Once the server is running, open your browser and navigate to:
[http://localhost:5000](http://localhost:5000)

## Project Structure
- `public/`: Static frontend files (HTML, CSS, JS, Images)
- `server/`: Backend code
  - `database/`: Database connection logic
  - `models/`: Mongoose schemas (Order, Enquiry)
  - `services/`: External services (Google Sheets)
  - `index.js`: Main server entry point
