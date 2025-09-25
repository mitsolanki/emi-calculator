from flask import Flask, render_template, request, jsonify
import math

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate_emi', methods=['POST'])
def calculate_emi():
    try:
        data = request.get_json()
        
        # Get input values
        principal = float(data.get('principal', 0))
        annual_rate = float(data.get('annual_rate', 0))
        tenure_years = float(data.get('tenure_years', 0))
        
        # Validation
        if principal <= 0 or annual_rate <= 0 or tenure_years <= 0:
            return jsonify({
                'success': False,
                'error': 'All values must be greater than zero'
            })
        
        # Calculate EMI
        monthly_rate = annual_rate / 12 / 100
        tenure_months = int(tenure_years * 12)
        
        # EMI Formula: [P × R × (1+R)^N] / [(1+R)^N – 1]
        if monthly_rate == 0:
            emi = principal / tenure_months
        else:
            emi = (principal * monthly_rate * math.pow(1 + monthly_rate, tenure_months)) / (math.pow(1 + monthly_rate, tenure_months) - 1)
        
        total_amount = emi * tenure_months
        total_interest = total_amount - principal
        
        # Generate EMI Schedule/Chart
        emi_schedule = []
        remaining_principal = principal
        total_interest_paid = 0
        total_principal_paid = 0
        
        for month in range(1, tenure_months + 1):
            # Calculate interest for current month
            interest_payment = remaining_principal * monthly_rate
            
            # Calculate principal payment
            principal_payment = emi - interest_payment
            
            # Update remaining principal
            remaining_principal -= principal_payment
            
            # Ensure remaining principal doesn't go negative due to rounding
            if remaining_principal < 0:
                principal_payment += remaining_principal
                remaining_principal = 0
            
            # Update totals
            total_interest_paid += interest_payment
            total_principal_paid += principal_payment
            
            # Add to schedule
            emi_schedule.append({
                'month': month,
                'emi': round(emi, 2),
                'principal': round(principal_payment, 2),
                'interest': round(interest_payment, 2),
                'remaining_balance': round(remaining_principal, 2),
                'total_interest_paid': round(total_interest_paid, 2),
                'total_principal_paid': round(total_principal_paid, 2)
            })
        
        return jsonify({
            'success': True,
            'emi': round(emi, 2),
            'total_amount': round(total_amount, 2),
            'total_interest': round(total_interest, 2),
            'principal': principal,
            'tenure_months': tenure_months,
            'emi_schedule': emi_schedule
        })
        
    except ValueError:
        return jsonify({
            'success': False,
            'error': 'Please enter valid numeric values'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'An error occurred during calculation'
        })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)