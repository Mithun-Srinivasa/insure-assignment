const fs = require('fs');

// Ice Cream Parlor Sales Analysis Program
// This program will read CSV data and generate sales reports
// Using: Node.js, basic JavaScript (no external libraries as per requirement)

// ========================================
// SECTION 1: Data Validation and Parsing
// ========================================

function validateData(csvContent) {
    const lines = csvContent.trim().split('\n');
    const validRecords = [];
    const invalidRecords = [];

    // loop through each line of CSV
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // skip empty lines if any
        if (!line) continue;

        const parts = line.split(',');
        
        // extracting data from CSV columns
        const date = parts[0];
        // handling SKU names that might contain commas
        const sku = parts.slice(1, parts.length - 3).join(',');
        const unitPrice = parseFloat(parts[parts.length - 3]);
        const qty = parseInt(parts[parts.length - 2]);
        const totalPrice = parseFloat(parts[parts.length - 1]);

        const errors = [];

        // validation 1: check date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            errors.push('Date is malformed');
        }

        // validation 2: quantity should be atleast 1
        if (qty < 1) {
            errors.push('Quantity is < 1');
        }

        // validation 3: unit price cannot be negative
        if (unitPrice < 0) {
            errors.push('Unit Price is < 0');
        }

        // validation 4: total price cannot be negative
        if (totalPrice < 0) {
            errors.push('Total Price is < 0');
        }

        // validation 5: checking if calculation is correct
        // Unit Price * Quantity should equal Total Price
        const expectedTotal = unitPrice * qty;
        if (Math.abs(expectedTotal - totalPrice) > 0.01) {
            errors.push(`Unit Price * Quantity != Total Price (Expected: ${expectedTotal}, Got: ${totalPrice})`);
        }

        // creating record object
        const record = {
            date,
            sku,
            unitPrice,
            quantity: qty,
            totalPrice,
            lineNumber: i + 1
        };

        // separate valid and invalid records
        if (errors.length > 0) {
            invalidRecords.push({
                ...record,
                errors
            });
        } else {
            validRecords.push(record);
        }
    }

    return { validRecords, invalidRecords };
}

// ========================================
// SECTION 2: Analysis Functions
// ========================================

// function to calculate total sales of the store
function getTotalSales(records) {
    let total = 0;
    for (let i = 0; i < records.length; i++) {
        total += records[i].totalPrice;
    }
    return total;
}

// function to get month-wise sales totals
function getMonthWiseSales(records) {
    const monthlySales = {};

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        // getting month from date (format: YYYY-MM)
        const month = record.date.substring(0, 7);

        if (!monthlySales[month]) {
            monthlySales[month] = 0;
        }
        monthlySales[month] += record.totalPrice;
    }

    return monthlySales;
}

// function to find most popular item (by quantity) for each month
function getMostPopularItems(records) {
    const itemsByMonth = {};

    // first, group all items by month and calculate quantities
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const month = record.date.substring(0, 7);

        if (!itemsByMonth[month]) {
            itemsByMonth[month] = {};
        }

        if (!itemsByMonth[month][record.sku]) {
            itemsByMonth[month][record.sku] = {
                totalQty: 0,
                orders: []
            };
        }

        itemsByMonth[month][record.sku].totalQty += record.quantity;
        itemsByMonth[month][record.sku].orders.push(record.quantity);
    }

    // now find the most popular item for each month
    const result = {};

    for (const month in itemsByMonth) {
        let maxQty = 0;
        let mostPopularItem = '';

        // loop through items to find highest quantity
        for (const sku in itemsByMonth[month]) {
            if (itemsByMonth[month][sku].totalQty > maxQty) {
                maxQty = itemsByMonth[month][sku].totalQty;
                mostPopularItem = sku;
            }
        }

        // calculate min, max, average orders for the popular item
        const orders = itemsByMonth[month][mostPopularItem].orders;
        let minOrder = orders[0];
        let maxOrder = orders[0];
        let sum = 0;

        for (let i = 0; i < orders.length; i++) {
            if (orders[i] < minOrder) minOrder = orders[i];
            if (orders[i] > maxOrder) maxOrder = orders[i];
            sum += orders[i];
        }

        const avgOrder = sum / orders.length;

        result[month] = {
            item: mostPopularItem,
            totalQuantity: maxQty,
            orderStats: {
                min: minOrder,
                max: maxOrder,
                average: Math.round(avgOrder * 100) / 100
            }
        };
    }

    return result;
}

// function to find items that generated most revenue each month
function getHighestRevenueItems(records) {
    const revenueByMonth = {};

    // calculating revenue for each item per month
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const month = record.date.substring(0, 7);

        if (!revenueByMonth[month]) {
            revenueByMonth[month] = {};
        }

        if (!revenueByMonth[month][record.sku]) {
            revenueByMonth[month][record.sku] = 0;
        }

        revenueByMonth[month][record.sku] += record.totalPrice;
    }

    // find item with highest revenue for each month
    const result = {};

    for (const month in revenueByMonth) {
        let maxRevenue = 0;
        let topItem = '';

        for (const sku in revenueByMonth[month]) {
            if (revenueByMonth[month][sku] > maxRevenue) {
                maxRevenue = revenueByMonth[month][sku];
                topItem = sku;
            }
        }

        result[month] = {
            item: topItem,
            revenue: maxRevenue
        };
    }

    return result;
}

// function to calculate month-to-month growth percentage for each item
function calculateGrowth(records) {
    const revenueByMonthAndItem = {};

    // first, calculate revenue for each item in each month
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const month = record.date.substring(0, 7);

        if (!revenueByMonthAndItem[month]) {
            revenueByMonthAndItem[month] = {};
        }

        if (!revenueByMonthAndItem[month][record.sku]) {
            revenueByMonthAndItem[month][record.sku] = 0;
        }

        revenueByMonthAndItem[month][record.sku] += record.totalPrice;
    }

    // get all months in sorted order
    const months = Object.keys(revenueByMonthAndItem).sort();

    // calculate growth between consecutive months
    const growthResult = {};

    for (let i = 1; i < months.length; i++) {
        const currentMonth = months[i];
        const prevMonth = months[i - 1];

        // get all unique items from both months
        const allItems = new Set([
            ...Object.keys(revenueByMonthAndItem[currentMonth] || {}),
            ...Object.keys(revenueByMonthAndItem[prevMonth] || {})
        ]);

        growthResult[currentMonth] = {};

        // calculate growth for each item
        for (const item of allItems) {
            const currentRevenue = revenueByMonthAndItem[currentMonth][item] || 0;
            const prevRevenue = revenueByMonthAndItem[prevMonth][item] || 0;

            if (prevRevenue === 0 && currentRevenue > 0) {
                // item is new this month
                growthResult[currentMonth][item] = 'New Item';
            } else if (prevRevenue > 0 && currentRevenue === 0) {
                // item was discontinued
                growthResult[currentMonth][item] = 'Discontinued';
            } else if (prevRevenue > 0) {
                // calculate percentage growth
                const growthPercent = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
                growthResult[currentMonth][item] = Math.round(growthPercent * 100) / 100 + '%';
            }
        }
    }

    return growthResult;
}

// ========================================
// SECTION 3: Report Generation
// ========================================

function generateReport(validRecords, invalidRecords) {
    console.log('='.repeat(80));
    console.log('ICE CREAM PARLOR SALES ANALYSIS REPORT');
    console.log('='.repeat(80));
    console.log();

    // Report 1: Total sales of the store
    console.log('1. TOTAL SALES OF THE STORE');
    console.log('-'.repeat(80));
    const totalSales = getTotalSales(validRecords);
    console.log(`Total Revenue: ₹${totalSales.toFixed(2)}`);
    console.log();

    // Report 2: Month-wise sales totals
    console.log('2. MONTH-WISE SALES TOTALS');
    console.log('-'.repeat(80));
    const monthwiseSales = getMonthWiseSales(validRecords);
    for (const month in monthwiseSales) {
        console.log(`${month}: ₹${monthwiseSales[month].toFixed(2)}`);
    }
    console.log();

    // Report 3: Most popular item each month
    console.log('3. MOST POPULAR ITEM (BY QUANTITY) EACH MONTH');
    console.log('-'.repeat(80));
    const popularItems = getMostPopularItems(validRecords);
    for (const month in popularItems) {
        const data = popularItems[month];
        console.log(`${month}: ${data.item}`);
        console.log(`  Total Quantity Sold: ${data.totalQuantity}`);
        console.log(`  Order Stats - Min: ${data.orderStats.min}, Max: ${data.orderStats.max}, Avg: ${data.orderStats.average}`);
    }
    console.log();

    // Report 4: Highest revenue item per month
    console.log('4. ITEMS GENERATING MOST REVENUE EACH MONTH');
    console.log('-'.repeat(80));
    const revenueItems = getHighestRevenueItems(validRecords);
    for (const month in revenueItems) {
        const data = revenueItems[month];
        console.log(`${month}: ${data.item} (₹${data.revenue.toFixed(2)})`);
    }
    console.log();

    // Report 5: Month-to-month growth
    console.log('5. MONTH-TO-MONTH GROWTH PER ITEM (%)');
    console.log('-'.repeat(80));
    const growthData = calculateGrowth(validRecords);
    for (const month in growthData) {
        console.log(`Growth from previous month to ${month}:`);
        for (const item in growthData[month]) {
            console.log(`  ${item}: ${growthData[month][item]}`);
        }
        console.log();
    }

    // Report 6: Data inconsistencies
    console.log('6. DATA INCONSISTENCIES DETECTED');
    console.log('-'.repeat(80));
    if (invalidRecords.length === 0) {
        console.log('No data inconsistencies found! All records are valid.');
    } else {
        console.log(`Found ${invalidRecords.length} inconsistent record(s):\n`);
        for (let i = 0; i < invalidRecords.length; i++) {
            const record = invalidRecords[i];
            console.log(`Line ${record.lineNumber}:`);
            console.log(`  Date: ${record.date}, SKU: ${record.sku}`);
            console.log(`  Unit Price: ${record.unitPrice}, Quantity: ${record.quantity}, Total: ${record.totalPrice}`);
            console.log(`  Errors:`);
            for (let j = 0; j < record.errors.length; j++) {
                console.log(`    - ${record.errors[j]}`);
            }
            console.log();
        }
    }
    console.log('='.repeat(80));
}

// ========================================
// SECTION 4: Main Program
// ========================================

function main() {
    try {
        // reading CSV file from current directory
        const csvContent = fs.readFileSync('data.csv', 'utf-8');
        
        // validate and parse the data
        const result = validateData(csvContent);
        const validRecords = result.validRecords;
        const invalidRecords = result.invalidRecords;
        
        console.log(`Processed ${validRecords.length + invalidRecords.length} total records`);
        console.log(`Valid records: ${validRecords.length}`);
        console.log(`Invalid records: ${invalidRecords.length}`);
        console.log();

        // generate all reports
        generateReport(validRecords, invalidRecords);

    } catch (error) {
        console.log('Error: Could not read or process the file');
        console.log('Error details:', error.message);
        process.exit(1);
    }
}

// run the program
main();

// ============================================================================
// ANSWERS TO WRITTEN QUESTIONS
// ============================================================================

/*
1. What was the most complex part of the assignment for you personally and why?

The most complex part for me was designing the logic to calculate the month-to-month growth percentage (Question 5). This was difficult because of several:

a) Had to handle unique possible scenarios:
   - Items that are completely new in the current month (ie. didn't exist before)
   - Items that got discontinued (ie. existed earlier but not in current month)
   - Items that exist in both months (need to calculate actual growth %)

b) Had to choose Set data structure so that I could capture all unique items from both the current and previous month.

c) Had to be careful about division by zero error. When previous month revenue 
   is zero, we cannot calculate percentage growth. So I handled that separately 
   by marking it as "New Item".

d) The architecture of the data structure - I needed a nested object structure 
   (month > item > revenue) and had to think about how to compare consecutive 
   months while keeping the code clean.

My first plan was to just loop through the items, however I then realized I need to 
first collect all revenue data month-wise, then sort the months, and only then 
compare consecutive months. This approach made building the logic cleaner.


2. Describe a bug you expect to hit while implementing this and how you would debug it.

A bug I expected (and did end up hitting) was related to CSV parsing 
when the SKU name contains commas.
ie if there's a product like "Chocolate, Vanilla Swirl", then doing a 
simple split(',') would cause loss of information because it would treat the 
comma in the product name as a column separator.

This would cause:
- The SKU name to be cut short
- The price fields would shift to wrong positions
- Validation would fail even for correct data

My approach to debugging:
a) First, I added console.log to print the parsed values:
   console.log({ date, sku, unitPrice, qty, totalPrice });

b) I immediately noticed that some SKU names looked incomplete and the 
   numbers are appearing in wrong variables.

c) To fix this, I realized that the CSV structure is fixed - Date is first, 
   and the last 3 columns are always numbers (unitPrice, qty, totalPrice).

d) So I changed the parsing logic to:
   - Take first element as date
   - Take last 3 elements as the numeric fields  
   - Join everything in the middle as the SKU name
   
   The logic resulted in something like this: parts.slice(1, parts.length - 3).join(',')

e) I tested with different cases to make sure it works for both simple names and names with commas.


3. Does your solution handle larger data sets without any performance implications?

Based on the complexities I calculated below my solution should work well for medium to 
large datasets but might face some performance issues with very large datasets 
(millions of records).

Here's my analysis:

Time Complexity:
- Reading file: O(n) - since we have to read all records
- Parsing and validation: O(n) - single loop through all records
- Total sales calculation: O(n) - one loop
- Month-wise sales: O(n) - one loop
- Most popular items: O(n) for grouping + O(m*k) where m = months, k = items per month
- Revenue calculations: Similar to above
- Growth calculation: O(n) + O(m*k) for comparing months

Overall time complexity: O(n + m*k) where n is total records, m is months, k is items
Relatively efficient.

Space Complexity:
We're storing the data in memory as objects and arrays, so space complexity is O(n + m*k).

Performance:
- Should easily handle datasets with 100K-500K records
- For very large datasets (10M+ records), we might face:
  1. Memory issues because we're loading entire file with readFileSync
  2. Slower processing time

If I needed to optimize for very large datasets, I would:
1. Use streaming to read file in chunks instead of loading everything in memory
2. Process data in batches
3. Ideally use a database for aggregations (though assignment says not to use SQL)
4. Use worker threads for parallel processing when needed

But for the current use case (a small ice cream parlor), the solution is 
very efficient and there should be no performance issues at all.
*/