import sys
sys.path.insert(0, r'c:\Users\rakes\OneDrive\Desktop\efs_vms_2.0\backend\efs-rag-bot')

from graph.nodes import detect_intent

# Test 1: AC question
print("=" * 60)
print("Test 1: AC Question Intent Detection")
result1 = detect_intent({'question': 'The AC in the meeting room is not working how to switch it on'})
print(f"Question: 'The AC in the meeting room is not working how to switch it on'")
print(f"Intent: {result1['intent']}")
print(f"Expected: HOW_TO")
print(f"Status: PASS" if result1['intent'] == 'HOW_TO' else "Status: FAIL")

# Test 2: Visitor OTP question
print("\n" + "=" * 60)
print("Test 2: Visitor OTP Question Intent Detection")
result2 = detect_intent({'question': 'My visitor has not received the OTP/pass can you resend it'})
print(f"Question: 'My visitor has not received the OTP/pass can you resend it'")
print(f"Intent: {result2['intent']}")
print(f"Expected: YES_NO or GENERAL_FAQ")
print(f"Status: PASS" if result2['intent'] in ['YES_NO', 'GENERAL_FAQ'] else "Status: FAIL")

# Test 3: Broken projector (should still be TROUBLESHOOT)
print("\n" + "=" * 60)
print("Test 3: Broken Projector (should be TROUBLESHOOT)")
result3 = detect_intent({'question': 'The projector is broken I need tech support'})
print(f"Question: 'The projector is broken I need tech support'")
print(f"Intent: {result3['intent']}")
print(f"Expected: TROUBLESHOOT")
print(f"Status: PASS" if result3['intent'] == 'TROUBLESHOOT' else "Status: FAIL")
