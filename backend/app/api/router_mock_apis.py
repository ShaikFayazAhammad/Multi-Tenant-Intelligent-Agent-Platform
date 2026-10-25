"""
Mock BFSI API Router
====================
Provides realistic, deterministic mock endpoints for Banking, Insurance, and Finance domains.
These are internal mock endpoints — NO real credentials required.
All responses are clearly labeled [MOCK] and use synthetic data for demonstration purposes.

Mount prefix: /api/mock
"""

import random
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Query, Path
from pydantic import BaseModel

router = APIRouter(prefix="/api/mock", tags=["[MOCK] BFSI Demo APIs"])


# ─────────────────────────────────────────────
# Synthetic Data Generators (deterministic by ID)
# ─────────────────────────────────────────────

def _seed_random(seed_str: str) -> random.Random:
    """Create a seeded Random instance so same ID always returns same data."""
    return random.Random(hash(seed_str) % (2**32))


def _gen_account(account_id: str) -> dict:
    r = _seed_random(account_id)
    names = ["Arjun Sharma", "Priya Patel", "Ravi Mehta", "Sneha Iyer", "Kiran Reddy",
             "Ananya Gupta", "Suresh Kumar", "Divya Nair", "Rohit Verma", "Meera Singh"]
    types = ["Savings", "Current", "Fixed Deposit", "NRI Savings"]
    branches = ["Mumbai Main", "Delhi Connaught Place", "Bengaluru Koramangala", "Chennai Anna Nagar", "Hyderabad HITECH"]
    return {
        "account_id": account_id,
        "account_number": f"HDFC{r.randint(10000000, 99999999)}",
        "account_type": r.choice(types),
        "holder_name": r.choice(names),
        "branch": r.choice(branches),
        "ifsc_code": f"HDFC00{r.randint(1000, 9999)}",
        "status": "Active",
        "opened_date": f"20{r.randint(10, 23)}-{r.randint(1,12):02d}-{r.randint(1,28):02d}",
    }


def _gen_balance(account_id: str) -> dict:
    r = _seed_random(f"bal_{account_id}")
    return {
        "account_id": account_id,
        "available_balance": round(r.uniform(5000, 250000), 2),
        "current_balance": round(r.uniform(5000, 260000), 2),
        "minimum_balance": 1000.0,
        "currency": "INR",
        "last_updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def _gen_transactions(account_id: str, limit: int = 10) -> list:
    r = _seed_random(f"txn_{account_id}")
    txn_types = ["Credit", "Debit"]
    descriptions = [
        "UPI Transfer", "ATM Withdrawal", "NEFT Inward", "Bill Payment - Electricity",
        "POS Purchase", "EMI Deduction", "Salary Credit", "FD Interest Credit",
        "Insurance Premium", "Tax Payment", "Mutual Fund SIP", "Mobile Recharge"
    ]
    txns = []
    for i in range(min(limit, 15)):
        t = r.choice(txn_types)
        txns.append({
            "txn_id": f"TXN{r.randint(100000000, 999999999)}",
            "date": (datetime.utcnow() - timedelta(days=i * r.randint(1, 5))).strftime("%Y-%m-%d"),
            "type": t,
            "amount": round(r.uniform(100, 50000), 2),
            "description": r.choice(descriptions),
            "balance_after": round(r.uniform(5000, 200000), 2),
            "reference": f"REF{r.randint(100000, 999999)}",
        })
    return txns


def _gen_loan(loan_id: str) -> dict:
    r = _seed_random(f"loan_{loan_id}")
    loan_types = ["Home Loan", "Personal Loan", "Auto Loan", "Education Loan", "Business Loan"]
    statuses = ["Active", "Active", "Active", "Pre-closure", "NPA Watch"]
    principal = round(r.choice([500000, 1000000, 1500000, 2500000, 750000, 300000]), 2)
    rate = round(r.uniform(7.5, 14.5), 2)
    tenure = r.choice([12, 24, 36, 60, 84, 120, 180, 240])
    emi = round((principal * (rate/100/12) * (1 + rate/100/12)**tenure) / ((1 + rate/100/12)**tenure - 1), 2)
    paid_months = r.randint(3, tenure - 1)
    return {
        "loan_id": loan_id,
        "loan_number": f"LN{r.randint(10000000, 99999999)}",
        "loan_type": r.choice(loan_types),
        "principal_amount": principal,
        "outstanding_amount": round(principal * (1 - paid_months / tenure) * r.uniform(0.9, 1.0), 2),
        "interest_rate": rate,
        "tenure_months": tenure,
        "emi_amount": emi,
        "paid_emis": paid_months,
        "remaining_emis": tenure - paid_months,
        "next_due_date": (datetime.utcnow() + timedelta(days=r.randint(3, 30))).strftime("%Y-%m-%d"),
        "status": r.choice(statuses),
        "disbursement_date": f"20{r.randint(19,24)}-{r.randint(1,12):02d}-{r.randint(1,28):02d}",
    }


def _gen_schedule(loan_id: str) -> list:
    loan = _gen_loan(loan_id)
    r = _seed_random(f"sched_{loan_id}")
    schedule = []
    remaining = loan["principal_amount"]
    rate_monthly = loan["interest_rate"] / 100 / 12
    for i in range(1, min(7, loan["remaining_emis"] + 1)):
        interest = round(remaining * rate_monthly, 2)
        principal_part = round(loan["emi_amount"] - interest, 2)
        remaining = max(0, round(remaining - principal_part, 2))
        due_date = (datetime.utcnow() + timedelta(days=30 * i)).strftime("%Y-%m-%d")
        schedule.append({
            "installment_no": loan["paid_emis"] + i,
            "due_date": due_date,
            "emi_amount": loan["emi_amount"],
            "principal_component": principal_part,
            "interest_component": interest,
            "outstanding_after": remaining,
            "status": "Upcoming",
        })
    return schedule


def _gen_policy(policy_id: str) -> dict:
    r = _seed_random(f"policy_{policy_id}")
    names = ["Rahul Sharma", "Sunita Patel", "Ajay Mehta", "Kavita Iyer", "Mohan Reddy"]
    types = ["Term Life", "Endowment", "ULIP", "Health", "Motor Comprehensive", "Travel"]
    companies = ["LIC", "HDFC Life", "ICICI Prudential", "SBI Life", "Max Life", "Star Health"]
    sum_assured = r.choice([500000, 1000000, 2500000, 5000000, 750000])
    premium = round(sum_assured * r.uniform(0.008, 0.025), 2)
    return {
        "policy_id": policy_id,
        "policy_number": f"POL{r.randint(10000000, 99999999)}",
        "policy_type": r.choice(types),
        "insurer": r.choice(companies),
        "holder_name": r.choice(names),
        "sum_assured": sum_assured,
        "premium_amount": premium,
        "premium_frequency": r.choice(["Monthly", "Quarterly", "Annually"]),
        "start_date": f"20{r.randint(18,23)}-{r.randint(1,12):02d}-01",
        "maturity_date": f"20{r.randint(28,40)}-{r.randint(1,12):02d}-01",
        "next_premium_due": (datetime.utcnow() + timedelta(days=r.randint(5, 60))).strftime("%Y-%m-%d"),
        "nominee": r.choice(["Spouse", "Father", "Mother", "Child"]),
        "status": "Active",
        "riders": r.choice([[], ["Accidental Death Benefit"], ["Critical Illness Rider"], ["Waiver of Premium"]]),
    }


def _gen_claim(claim_id: str) -> dict:
    r = _seed_random(f"claim_{claim_id}")
    stages = ["Initiated", "Under Review", "Documents Received", "Assessment", "Approved", "Settled"]
    types = ["Death Benefit", "Critical Illness", "Hospitalization", "Accidental Disability", "Property Damage", "Motor Accident"]
    return {
        "claim_id": claim_id,
        "claim_number": f"CLM{r.randint(10000000, 99999999)}",
        "claim_type": r.choice(types),
        "claimed_amount": round(r.uniform(10000, 500000), 2),
        "approved_amount": round(r.uniform(8000, 450000), 2),
        "status": r.choice(stages),
        "filed_date": (datetime.utcnow() - timedelta(days=r.randint(5, 90))).strftime("%Y-%m-%d"),
        "expected_resolution": (datetime.utcnow() + timedelta(days=r.randint(3, 30))).strftime("%Y-%m-%d"),
        "assigned_officer": f"Officer #{r.randint(1001, 9999)}",
        "documents_required": r.choice([[], ["Hospital Bills", "Discharge Summary"], ["FIR Copy", "Repair Bills"]]),
        "remarks": "Claim is under standard review process.",
    }


# ─────────────────────────────────────────────
# BANKING ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/banking/accounts/{account_id}", summary="[MOCK] Get Account Details")
def get_account_details(account_id: str = Path(..., description="Account ID (any string)")) -> dict:
    """Returns synthetic account details. Any account_id works — data is deterministic by ID."""
    return {
        "_mock": True,
        "_label": "MOCK BANKING API — Synthetic Data",
        "data": _gen_account(account_id),
    }


@router.get("/banking/accounts/{account_id}/balance", summary="[MOCK] Get Account Balance")
def get_account_balance(account_id: str = Path(...)) -> dict:
    """Returns synthetic balance for any account ID."""
    return {
        "_mock": True,
        "_label": "MOCK BANKING API — Synthetic Data",
        "data": {**_gen_account(account_id), **_gen_balance(account_id)},
    }


@router.get("/banking/accounts/{account_id}/transactions", summary="[MOCK] Get Transactions")
def get_transactions(
    account_id: str = Path(...),
    limit: int = Query(10, ge=1, le=50),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
) -> dict:
    """Returns synthetic transaction history. limit controls number of records (max 50)."""
    return {
        "_mock": True,
        "_label": "MOCK BANKING API — Synthetic Data",
        "account_id": account_id,
        "from_date": from_date or (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d"),
        "to_date": to_date or datetime.utcnow().strftime("%Y-%m-%d"),
        "total_records": limit,
        "transactions": _gen_transactions(account_id, limit),
    }


@router.get("/banking/loans/{loan_id}/status", summary="[MOCK] Get Loan Status")
def get_loan_status(loan_id: str = Path(...)) -> dict:
    """Returns synthetic loan status and details for any loan ID."""
    return {
        "_mock": True,
        "_label": "MOCK BANKING API — Synthetic Data",
        "data": _gen_loan(loan_id),
    }


@router.get("/banking/loans/{loan_id}/schedule", summary="[MOCK] Get Loan Repayment Schedule")
def get_loan_schedule(loan_id: str = Path(...)) -> dict:
    """Returns upcoming 6 EMI installments for any loan ID."""
    loan = _gen_loan(loan_id)
    return {
        "_mock": True,
        "_label": "MOCK BANKING API — Synthetic Data",
        "loan_id": loan_id,
        "loan_number": loan["loan_number"],
        "emi_amount": loan["emi_amount"],
        "upcoming_schedule": _gen_schedule(loan_id),
    }


class ServiceRequestCreate(BaseModel):
    account_id: str
    request_type: str  # "card_block", "cheque_book", "statement", "update_mobile"
    description: Optional[str] = ""
    priority: Optional[str] = "Normal"


@router.post("/banking/service-requests", summary="[MOCK] Create Banking Service Request")
def create_service_request(req: ServiceRequestCreate) -> dict:
    """Creates a mock service request. Always succeeds with a reference number."""
    ref = f"SR{random.randint(10000000, 99999999)}"
    return {
        "_mock": True,
        "_label": "MOCK BANKING API — Synthetic Data",
        "status": "created",
        "service_request_id": ref,
        "account_id": req.account_id,
        "request_type": req.request_type,
        "priority": req.priority,
        "expected_resolution": (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d"),
        "message": f"Service request {ref} created successfully. You will receive an SMS confirmation.",
    }


# ─────────────────────────────────────────────
# INSURANCE ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/insurance/policies/{policy_id}", summary="[MOCK] Get Policy Details")
def get_policy_details(policy_id: str = Path(...)) -> dict:
    """Returns synthetic insurance policy details for any policy ID."""
    return {
        "_mock": True,
        "_label": "MOCK INSURANCE API — Synthetic Data",
        "data": _gen_policy(policy_id),
    }


@router.get("/insurance/policies/{policy_id}/status", summary="[MOCK] Get Policy Status")
def get_policy_status(policy_id: str = Path(...)) -> dict:
    """Returns policy status including premium due and coverage details."""
    policy = _gen_policy(policy_id)
    return {
        "_mock": True,
        "_label": "MOCK INSURANCE API — Synthetic Data",
        "policy_id": policy_id,
        "policy_number": policy["policy_number"],
        "status": policy["status"],
        "premium_due": policy["next_premium_due"],
        "premium_amount": policy["premium_amount"],
        "coverage_active": True,
        "days_to_premium_due": (
            datetime.strptime(policy["next_premium_due"], "%Y-%m-%d") - datetime.utcnow()
        ).days,
    }


@router.get("/insurance/claims/{claim_id}/status", summary="[MOCK] Get Claim Status")
def get_claim_status(claim_id: str = Path(...)) -> dict:
    """Returns claim processing status for any claim ID."""
    return {
        "_mock": True,
        "_label": "MOCK INSURANCE API — Synthetic Data",
        "data": _gen_claim(claim_id),
    }


class ClaimCreate(BaseModel):
    policy_id: str
    claim_type: str  # "death", "hospitalization", "accident", "critical_illness"
    claimed_amount: float
    incident_date: str
    description: str
    contact_phone: Optional[str] = ""


@router.post("/insurance/claims", summary="[MOCK] Create Insurance Claim")
def create_claim(req: ClaimCreate) -> dict:
    """Registers a new mock insurance claim. Always succeeds with a claim ID."""
    claim_id = f"CLM{random.randint(10000000, 99999999)}"
    return {
        "_mock": True,
        "_label": "MOCK INSURANCE API — Synthetic Data",
        "status": "registered",
        "claim_id": claim_id,
        "claim_number": f"CLM{random.randint(10000000, 99999999)}",
        "policy_id": req.policy_id,
        "claim_type": req.claim_type,
        "claimed_amount": req.claimed_amount,
        "next_step": "A claims officer will contact you within 48 hours. Keep all documents ready.",
        "documents_required": ["Hospital bills", "Doctor's certificate", "Aadhaar copy", "Policy document"],
        "estimated_resolution": (datetime.utcnow() + timedelta(days=15)).strftime("%Y-%m-%d"),
    }


class RenewalCreate(BaseModel):
    policy_id: str
    payment_method: Optional[str] = "Net Banking"


@router.post("/insurance/renewals", summary="[MOCK] Create Policy Renewal Request")
def create_renewal(req: RenewalCreate) -> dict:
    """Initiates a mock policy renewal. Returns renewal confirmation."""
    policy = _gen_policy(req.policy_id)
    renewal_ref = f"RNW{random.randint(10000000, 99999999)}"
    return {
        "_mock": True,
        "_label": "MOCK INSURANCE API — Synthetic Data",
        "status": "initiated",
        "renewal_reference": renewal_ref,
        "policy_id": req.policy_id,
        "policy_number": policy["policy_number"],
        "renewal_premium": policy["premium_amount"],
        "payment_method": req.payment_method,
        "new_coverage_start": datetime.utcnow().strftime("%Y-%m-%d"),
        "new_coverage_end": (datetime.utcnow() + timedelta(days=365)).strftime("%Y-%m-%d"),
        "message": f"Policy renewal {renewal_ref} initiated. Complete payment to activate coverage.",
    }


# ─────────────────────────────────────────────
# FINANCE ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/finance/emi", summary="[MOCK] Calculate EMI")
def calculate_emi(
    principal: float = Query(..., gt=0, description="Loan principal in INR"),
    rate: float = Query(..., gt=0, description="Annual interest rate (%)"),
    tenure: int = Query(..., gt=0, description="Loan tenure in months"),
) -> dict:
    """Calculates EMI using standard reducing balance formula."""
    monthly_rate = rate / 100 / 12
    if monthly_rate == 0:
        emi = principal / tenure
    else:
        emi = (principal * monthly_rate * (1 + monthly_rate) ** tenure) / ((1 + monthly_rate) ** tenure - 1)

    total_payment = round(emi * tenure, 2)
    total_interest = round(total_payment - principal, 2)

    return {
        "_mock": True,
        "_label": "MOCK FINANCE API — EMI Calculator",
        "inputs": {"principal": principal, "annual_rate_percent": rate, "tenure_months": tenure},
        "emi_amount": round(emi, 2),
        "total_amount_payable": total_payment,
        "total_interest": total_interest,
        "interest_percentage": round((total_interest / principal) * 100, 2),
        "breakdown": {
            "month_1": {
                "emi": round(emi, 2),
                "principal_part": round(emi - (principal * monthly_rate), 2),
                "interest_part": round(principal * monthly_rate, 2),
            },
        },
    }


@router.get("/finance/loan-applications/{app_id}/status", summary="[MOCK] Loan Application Status")
def get_loan_application_status(app_id: str = Path(...)) -> dict:
    """Returns synthetic loan application processing status."""
    r = _seed_random(f"lapp_{app_id}")
    statuses = ["Received", "Under Review", "Credit Assessment", "Document Verification", "Approved", "Disbursed", "Rejected"]
    amounts = [200000, 500000, 750000, 1000000, 1500000, 2000000]
    return {
        "_mock": True,
        "_label": "MOCK FINANCE API — Synthetic Data",
        "application_id": app_id,
        "application_number": f"APP{r.randint(10000000, 99999999)}",
        "applicant_name": r.choice(["Rakesh Kumar", "Priya Sharma", "Amit Singh", "Sonal Patel"]),
        "loan_type": r.choice(["Home Loan", "Personal Loan", "Business Loan", "Gold Loan"]),
        "applied_amount": r.choice(amounts),
        "status": r.choice(statuses),
        "applied_date": (datetime.utcnow() - timedelta(days=r.randint(1, 30))).strftime("%Y-%m-%d"),
        "last_updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "assigned_officer": f"Loan Officer #{r.randint(100, 999)}",
        "remarks": "Application is progressing through standard review process.",
        "estimated_decision_date": (datetime.utcnow() + timedelta(days=r.randint(2, 10))).strftime("%Y-%m-%d"),
    }


@router.get("/finance/repayments/{loan_id}/history", summary="[MOCK] Loan Repayment History")
def get_repayment_history(
    loan_id: str = Path(...),
    limit: int = Query(12, ge=1, le=60),
) -> dict:
    """Returns synthetic repayment history for any loan ID."""
    r = _seed_random(f"repay_{loan_id}")
    loan = _gen_loan(loan_id)
    history = []
    for i in range(min(limit, loan["paid_emis"])):
        payment_date = (datetime.utcnow() - timedelta(days=30 * (i + 1))).strftime("%Y-%m-%d")
        history.append({
            "installment_no": loan["paid_emis"] - i,
            "payment_date": payment_date,
            "amount_paid": loan["emi_amount"],
            "principal_paid": round(loan["emi_amount"] * r.uniform(0.6, 0.85), 2),
            "interest_paid": round(loan["emi_amount"] * r.uniform(0.15, 0.4), 2),
            "payment_mode": r.choice(["NACH", "UPI", "Net Banking", "Cheque"]),
            "reference": f"PAY{r.randint(100000000, 999999999)}",
            "status": "Paid",
        })
    return {
        "_mock": True,
        "_label": "MOCK FINANCE API — Synthetic Data",
        "loan_id": loan_id,
        "loan_number": loan["loan_number"],
        "total_paid_installments": loan["paid_emis"],
        "history": history,
    }
