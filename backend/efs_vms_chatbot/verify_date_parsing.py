"""
Quick verification script to test the meeting room booking flow.

This script demonstrates the expected behavior:
1. User says "today" -> should get 2026-02-03
2. User says "tomorrow" -> should get 2026-02-04
3. User says "Feb 10" -> should get 2026-02-10
4. User says "Jan 25" -> should get 2027-01-25 (past date rolls to next year)
"""
from tools.meeting_room_tools import parse_flexible_date
from datetime import datetime


def test_booking_flow():
    """Test the actual booking flow with different date inputs"""
    
    print("=" * 60)
    print("MEETING ROOM BOOKING - DATE VALIDATION TEST")
    print(f"Current Date/Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()
    
    test_cases = [
        ("today", "2026-02-03"),
        ("tomorrow", "2026-02-04"),
        ("Feb 10", "2026-02-10"),
        ("10th February", "2026-02-10"),
        ("Jan 25", "2027-01-25"),  # Past date, should roll to next year
        ("March 15", "2026-03-15"),
        ("15th March", "2026-03-15"),
        ("2026-02-15", "2026-02-15"),
        ("15/02/2026", "2026-02-15"),
    ]
    
    passed = 0
    failed = 0
    
    for user_input, expected in test_cases:
        result = parse_flexible_date(user_input)
        status = "[PASS]" if result == expected else "[FAIL]"
        
        if result == expected:
            passed += 1
        else:
            failed += 1
        
        print(f"{status} | Input: '{user_input:20s}' -> Expected: {expected} | Got: {result}")
    
    print()
    print("=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed == 0:
        print("[SUCCESS] All date parsing tests passed!")
        print()
        print("NEXT STEPS:")
        print("1. Start the chatbot server: python main_fastapi.py")
        print("2. Test the complete booking flow:")
        print("   - Say: 'I want to book a meeting room'")
        print("   - When asked for date: 'today at 3pm'")
        print("   - Verify the system proceeds to check availability")
        print("   - Select a room and confirm booking")
    else:
        print("[WARNING] Some tests failed. Please review the implementation.")


if __name__ == "__main__":
    test_booking_flow()
