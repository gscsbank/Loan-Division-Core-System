# System Requirements & Technical Specifications
## Project: Bank Management & Field Operations System
**Client:** Galapitiyagama Sanasa Bank
**Developer:** Iraasoft Solution

---

### 1. System Overview
A high-end, responsive web-based management system designed for Loan Management Officers to track field staff performance, savings progress, loan inspections, and school savings programs. The system focuses on localized data storage, interactive mapping, and automated reporting.

---

### 2. Tech Stack Requirements
* **Frontend:** HTML5, Modern JavaScript (ES6+)
* **Styling:** Tailwind CSS (via CDN or CLI) for a utility-first, sleek UI.
* **Animations:** Animate.css or Framer Motion (for "Next Level" animated transitions).
* **Database:** **Dexie.js** (A wrapper for IndexedDB) to store all data locally in the browser with high performance.
* **Charts:** **Chart.js** for savings progress and monthly comparisons.
* **Mapping:** **Leaflet.js** for the Field Routine Map (OpenStreetMap integration).
* **Utilities:** **FileSaver.js** (for Backup/Restore) and **jsPDF** (for generating Inspection Reports).

---

### 3. Core Modules & Features

#### A. Field Officer Management (Performance & Commission)
* **Daily Log:** Input fields for Date, Officer Name, and Number of New Accounts.
* **Commission Engine:** Auto-calculate monthly totals per officer.
* **Monthly Report:** A summary view for the Manager showing total accounts fetched vs. commission earned.

#### B. Transport & Fuel Tracking
* **Daily Meter Log:** Capture Start Meter (KM), End Meter (KM), and Route Description.
* **Automatic Calculation:** System must auto-calculate `Total Distance = End - Start`.
* **Reports:** Individual monthly reports for each officer showing total KM driven for fuel allowance processing.

#### C. Field Savings Progress (Advanced Analytics)
* **Data Capture:** Monthly saving collection totals per officer.
* **Comparison Logic:** * Current Month vs. Previous Month.
    * Cumulative Comparison (e.g., March report shows Jan + Feb + March vs. Target).
* **Visuals:** Bar/Line charts showing growth trends throughout the year.

#### D. Field Routine Map (Visual Substitute Aid)
* **Customer Plotting:** Map view showing pins for Customers/Shops.
* **Metadata:** Clicking a pin displays: Account Number, Name, and Visit Frequency.
* **Substitute Support:** If an officer is on leave, the new officer can view the "Route Map" to identify all collection points.

#### E. Loan Inspection System (Pre & Post)
* **Digital Form:** Entry for income sources, assets, and liabilities.
* **Photo Integration:** Ability to upload/attach photos of the residence and business assets.
* **PDF Generator:** A button to "Generate Inspection Report" which formats the data and photos into a professional PDF for printing/filing.
* **Post-Loan Follow-up:** A secondary module to record post-disbursement visits with history tracking.

#### F. School Savings & Communication
* **Student Profiles:** Database of School, Student Name, Account No, and Contact Numbers.
* **Bulk Messaging:** * Interface to type a message and trigger WhatsApp/SMS.
    * Integration via `whatsapp://send?phone=...` for single messages or a specialized API for bulk.
    * Filtering by school or grade.

#### G. Event Planning & Board Approvals
* **Proposal Builder:** Draft bank programs/events.
* **Approval Workflow:** Status tags (Pending, Manager Approved, Board Approved).

---

### 4. Technical Requirements & Security

#### Data Persistence (Dexie.js Implementation)
* Define schemas for: `officers`, `fuelLogs`, `savings`, `customers`, `loanReports`, `schoolSavings`.
* Ensure all queries are asynchronous for a smooth UI experience.

#### Animated Interface (UI/UX)
* **Glassmorphism effect:** Use Tailwind’s backdrop-blur for a modern feel.
* **Transitions:** Smooth page fades and hover effects on dashboard cards.
* **Sidebar:** Collapsible navigation with intuitive icons (Heroicons).

#### Backup & Restore
* **Export:** Convert the entire Dexie.js database into a `.json` file for local backup.
* **Import:** Restore data from a `.json` file to prevent data loss on browser clear-cache.

---

### 5. Deployment Instructions
1.  Initialize a project folder with `index.html`.
2.  Include Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`.
3.  Include Dexie.js: `<script src="https://unpkg.com/dexie/dist/dexie.js"></script>`.
4.  Configure the `db.js` file to handle schema versioning.
5.  Footer Credit: **"Developed for Galapitiyagama Sanasa Bank by Iraasoft Solution"** must be hardcoded into the layout.

---