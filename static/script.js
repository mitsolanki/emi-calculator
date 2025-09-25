// EMI Calculator JavaScript with Full Schedule
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('emiForm');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const resultsCard = document.getElementById('resultsCard');
    const scheduleCard = document.getElementById('scheduleCard');
    const calculateBtn = document.getElementById('calculateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const yearlyViewBtn = document.getElementById('yearlyViewBtn');
    const monthlyViewBtn = document.getElementById('monthlyViewBtn');

    let currentScheduleData = null;

    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous messages
        hideError();
        hideResults();
        hideSchedule();
        
        // Get form data
        const formData = new FormData(form);
        const data = {
            principal: parseFloat(formData.get('principal')),
            annual_rate: parseFloat(formData.get('annual_rate')),
            tenure_years: parseFloat(formData.get('tenure_years'))
        };
        
        // Validate input
        if (!validateInput(data)) {
            return;
        }
        
        // Show loading
        showLoading();
        
        try {
            // Make API call
            const response = await fetch('/calculate_emi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                currentScheduleData = result;
                displayResults(result, data.annual_rate);
                displaySchedule(result.emi_schedule);
            } else {
                showError(result.error);
            }
            
        } catch (error) {
            console.error('Error:', error);
            showError('Network error. Please check your connection and try again.');
        } finally {
            hideLoading();
        }
    });
    
    // Download button handler
    downloadBtn.addEventListener('click', function() {
        if (currentScheduleData) {
            downloadScheduleAsCSV(currentScheduleData);
        }
    });
    
    // View toggle handlers
    yearlyViewBtn.addEventListener('click', function() {
        showYearlyView();
        setActiveToggle(yearlyViewBtn);
    });
    
    monthlyViewBtn.addEventListener('click', function() {
        showMonthlyView();
        setActiveToggle(monthlyViewBtn);
    });
    
    // Input validation
    function validateInput(data) {
        if (isNaN(data.principal) || data.principal <= 0) {
            showError('Please enter a valid loan amount greater than 0');
            return false;
        }
        
        if (isNaN(data.annual_rate) || data.annual_rate <= 0 || data.annual_rate > 100) {
            showError('Please enter a valid interest rate between 0.1% and 100%');
            return false;
        }
        
        if (isNaN(data.tenure_years) || data.tenure_years <= 0 || data.tenure_years > 50) {
            showError('Please enter a valid loan tenure between 1 and 50 years');
            return false;
        }
        
        return true;
    }
    
    // Display results
    function displayResults(result, annualRate) {
        // Update result values
        document.getElementById('emiAmount').textContent = `₹${formatNumber(result.emi)}`;
        document.getElementById('totalAmount').textContent = `₹${formatNumber(result.total_amount)}`;
        document.getElementById('totalInterest').textContent = `₹${formatNumber(result.total_interest)}`;
        document.getElementById('principalAmount').textContent = `₹${formatNumber(result.principal)}`;
        
        // Update loan summary
        document.getElementById('loanDuration').textContent = `${result.tenure_months} months`;
        document.getElementById('interestPercentage').textContent = `${annualRate}% per annum`;
        
        // Show results with animation
        showResults();
    }
    
    // Display EMI Schedule
    function displaySchedule(schedule) {
        const tableBody = document.getElementById('scheduleTableBody');
        const totalPayments = document.getElementById('totalPayments');
        const totalPrincipalPaid = document.getElementById('totalPrincipalPaid');
        const totalInterestPaid = document.getElementById('totalInterestPaid');
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Update summary stats
        totalPayments.textContent = schedule.length;
        const lastRow = schedule[schedule.length - 1];
        totalPrincipalPaid.textContent = `₹${formatNumber(lastRow.total_principal_paid)}`;
        totalInterestPaid.textContent = `₹${formatNumber(lastRow.total_interest_paid)}`;
        
        // Populate table rows
        schedule.forEach((row, index) => {
            const tr = document.createElement('tr');
            
            // Highlight every 12th row (yearly)
            if ((index + 1) % 12 === 0) {
                tr.classList.add('year-end');
                tr.style.backgroundColor = '#e6f3ff';
                tr.style.fontWeight = '600';
            }
            
            tr.innerHTML = `
                <td>${row.month}</td>
                <td>₹${formatNumber(row.emi)}</td>
                <td>₹${formatNumber(row.principal)}</td>
                <td>₹${formatNumber(row.interest)}</td>
                <td>₹${formatNumber(row.remaining_balance)}</td>
                <td>₹${formatNumber(row.total_interest_paid)}</td>
            `;
            
            tableBody.appendChild(tr);
        });
        
        // Generate yearly summary
        generateYearlyView(schedule);
        
        // Show schedule
        showSchedule();
    }
    
    // Generate yearly view
    function generateYearlyView(schedule) {
        const yearlyContent = document.getElementById('yearlyScheduleContent');
        yearlyContent.innerHTML = '';
        
        const yearlyData = {};
        
        // Group data by year
        schedule.forEach(row => {
            const year = Math.ceil(row.month / 12);
            if (!yearlyData[year]) {
                yearlyData[year] = {
                    year: year,
                    totalEMI: 0,
                    totalPrincipal: 0,
                    totalInterest: 0,
                    startingBalance: 0,
                    endingBalance: 0,
                    months: []
                };
            }
            
            yearlyData[year].totalEMI += row.emi;
            yearlyData[year].totalPrincipal += row.principal;
            yearlyData[year].totalInterest += row.interest;
            yearlyData[year].endingBalance = row.remaining_balance;
            yearlyData[year].months.push(row);
            
            if (yearlyData[year].months.length === 1) {
                yearlyData[year].startingBalance = row.remaining_balance + row.principal;
            }
        });
        
        // Create yearly summary cards
        Object.values(yearlyData).forEach(yearData => {
            const yearDiv = document.createElement('div');
            yearDiv.className = 'year-summary';
            
            yearDiv.innerHTML = `
                <div class="year-header">Year ${yearData.year}</div>
                <div class="year-stats">
                    <div class="year-stat">
                        <div class="year-stat-label">Total EMI Paid</div>
                        <div class="year-stat-value">₹${formatNumber(yearData.totalEMI)}</div>
                    </div>
                    <div class="year-stat">
                        <div class="year-stat-label">Principal Paid</div>
                        <div class="year-stat-value">₹${formatNumber(yearData.totalPrincipal)}</div>
                    </div>
                    <div class="year-stat">
                        <div class="year-stat-label">Interest Paid</div>
                        <div class="year-stat-value">₹${formatNumber(yearData.totalInterest)}</div>
                    </div>
                    <div class="year-stat">
                        <div class="year-stat-label">Starting Balance</div>
                        <div class="year-stat-value">₹${formatNumber(yearData.startingBalance)}</div>
                    </div>
                    <div class="year-stat">
                        <div class="year-stat-label">Ending Balance</div>
                        <div class="year-stat-value">₹${formatNumber(yearData.endingBalance)}</div>
                    </div>
                    <div class="year-stat">
                        <div class="year-stat-label">Months</div>
                        <div class="year-stat-value">${yearData.months.length}</div>
                    </div>
                </div>
            `;
            
            yearlyContent.appendChild(yearDiv);
        });
    }
    
    // Download schedule as CSV
    function downloadScheduleAsCSV(data) {
        const headers = ['Month', 'EMI Amount', 'Principal', 'Interest', 'Remaining Balance', 'Total Interest Paid'];
        const csvContent = [
            headers.join(','),
            ...data.emi_schedule.map(row => [
                row.month,
                row.emi,
                row.principal,
                row.interest,
                row.remaining_balance,
                row.total_interest_paid
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EMI_Schedule_${data.principal}_${data.tenure_months}months.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    // View toggle functions
    function showYearlyView() {
        document.getElementById('scheduleTable').parentElement.classList.add('hidden');
        document.getElementById('yearlySchedule').classList.remove('hidden');
    }
    
    function showMonthlyView() {
        document.getElementById('scheduleTable').parentElement.classList.remove('hidden');
        document.getElementById('yearlySchedule').classList.add('hidden');
    }
    
    function setActiveToggle(activeBtn) {
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }
    
    // Format number with commas
    function formatNumber(num) {
        return new Intl.NumberFormat('en-IN').format(Math.round(num));
    }
    
    // Show/Hide functions
    function showLoading() {
        loadingSpinner.classList.remove('hidden');
        calculateBtn.disabled = true;
        calculateBtn.innerHTML = '<span class="spinner"></span> Calculating...';
    }
    
    function hideLoading() {
        loadingSpinner.classList.add('hidden');
        calculateBtn.disabled = false;
        calculateBtn.innerHTML = '<span class="btn-icon">🧮</span> Calculate EMI & Schedule';
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            hideError();
        }, 5000);
    }
    
    function hideError() {
        errorMessage.classList.add('hidden');
    }
    
    function showResults() {
        resultsCard.classList.remove('hidden');
    }
    
    function hideResults() {
        resultsCard.classList.add('hidden');
    }
    
    function showSchedule() {
        scheduleCard.classList.remove('hidden');
        
        // Smooth scroll to schedule
        setTimeout(() => {
            scheduleCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 300);
    }
    
    function hideSchedule() {
        scheduleCard.classList.add('hidden');
    }
    
    // Input formatting and validation
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        // Add input event listeners for real-time validation
        input.addEventListener('input', function() {
            validateInputField(this);
        });
        
        // Add focus/blur effects
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
    
    function validateInputField(input) {
        const value = parseFloat(input.value);
        
        // Remove any previous error styling
        input.classList.remove('error');
        
        if (input.value && isNaN(value)) {
            input.classList.add('error');
            return false;
        }
        
        // Specific validation based on input type
        switch(input.id) {
            case 'principal':
                if (value < 1000) {
                    input.classList.add('error');
                    return false;
                }
                break;
            case 'annual_rate':
                if (value < 0.1 || value > 100) {
                    input.classList.add('error');
                    return false;
                }
                break;
            case 'tenure_years':
                if (value < 1 || value > 50) {
                    input.classList.add('error');
                    return false;
                }
                break;
        }
        
        return true;
    }
    
    // Add sample data for quick testing
    function loadSampleData() {
        document.getElementById('principal').value = '500000';
        document.getElementById('annual_rate').value = '8.5';
        document.getElementById('tenure_years').value = '20';
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to calculate
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
        
        // Ctrl/Cmd + R to reset (prevent page reload)
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            resetCalculator();
        }
    });
    
    // Add sample data button (for development/testing)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const sampleBtn = document.createElement('button');
        sampleBtn.textContent = '📝 Load Sample Data';
        sampleBtn.type = 'button';
        sampleBtn.className = 'sample-btn';
        sampleBtn.style.cssText = `
            background: #ed8936;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.9rem;
            cursor: pointer;
            margin-bottom: 1rem;
            display: block;
            width: 100%;
        `;
        sampleBtn.onclick = loadSampleData;
        form.insertBefore(sampleBtn, form.firstChild);
    }
});

// Global function for reset button
function resetCalculator() {
    // Clear form
    document.getElementById('emiForm').reset();
    
    // Hide results, schedule and errors
    document.getElementById('resultsCard').classList.add('hidden');
    document.getElementById('scheduleCard').classList.add('hidden');
    document.getElementById('errorMessage').classList.add('hidden');
    document.getElementById('loadingSpinner').classList.add('hidden');
    
    // Reset to monthly view
    document.getElementById('monthlyViewBtn').classList.add('active');
    document.getElementById('yearlyViewBtn').classList.remove('active');
    showMonthlyView();
    
    // Focus on first input
    document.getElementById('principal').focus();
    
    // Smooth scroll to top
    document.querySelector('.calculator-card').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

// Add some utility functions for enhanced UX
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show temporary success message
        const toast = document.createElement('div');
        toast.textContent = 'Copied to clipboard!';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 2000);
    });
}

// Add click-to-copy functionality to result values
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('result-value')) {
        const text = e.target.textContent;
        copyToClipboard(text);
    }
});