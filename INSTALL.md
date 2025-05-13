# VAI-Liq-Planung Installation Guide

To run the application with the enhanced planning features, follow these steps:

## Prerequisites
- Node.js 18+ or Node.js 20+
- npm or yarn

## Installation Steps

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Install chart.js and react-chartjs-2 for the visualization features:
   ```bash
   npm install chart.js react-chartjs-2
   # or 
   yarn add chart.js react-chartjs-2
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` to add your Supabase configuration.

5. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## New Features

### Planning Visualization

The application now includes enhanced planning features:

1. **Summary View**: A dashboard-style overview of your financial position
2. **Chart View**: Visualize income, expenses, and account balance over time
3. **Table View**: Traditional transaction table view

### Management Report

The "Management-Bericht" feature provides a comprehensive PDF report with:

- Financial summary
- Key metrics
- Category breakdown
- Visual representation of your financial data

## Troubleshooting

If you encounter issues with chart rendering, make sure:
1. chart.js and react-chartjs-2 packages are installed
2. Your browser supports modern JavaScript features
3. You're using a recent version of Next.js (13+) 