import re

file_path = r'src/app/login/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove states
content = re.sub(
    r"  const \[admissionNumber, setAdmissionNumber\] = useState\(''\);\n  const \[department, setDepartment\] = useState\(''\);\n  const \[yearLevel, setYearLevel\] = useState\(''\);\n",
    '', content
)

# 2. Remove auto-fill
content = re.sub(
    r"      // Auto-fill fields\n      setAdmissionNumber\(result\.parsed\.admissionNumber\);\n      setDepartment\(result\.parsed\.department\);\n      setYearLevel\(result\.parsed\.yearLevel\);\n",
    '', content
)

# 3. Handle signup() payload
content = re.sub(
    r"          admissionNumber: admissionNumber\.trim\(\)\.toUpperCase\(\),\n          department,\n          yearLevel,",
    "          admissionNumber: parsedEmail?.admissionNumber || '',\n          department: parsedEmail?.department || '',\n          yearLevel: parsedEmail?.yearLevel || '',",
    content
)

# 4. Handle validations (lines 235-240)
old_val = "      if (!admissionNumber.trim() && !parsedEmail) { setError('Admission number is required'); return; }\n      if (!department && !parsedEmail) { setError('Please select your department'); return; }\n      if (!yearLevel && !parsedEmail) { setError('Please select your year'); return; }"
new_val = "      if (!parsedEmail) { setError('Your email must be a valid SVNIT student format (e.g., i22ma038@amhd.svnit.ac.in)'); return; }"
content = content.replace(old_val, new_val)

# 5. Remove JSX manual block
# Finding the block from {/* Manual fields */} down to just before {isSignup && ( DOB
content = re.sub(
    r"          \{/\* Manual fields only if email not parsed \*/\}.*?(?=          \{isSignup && \(\n            <div>\n              <label className=\"block text-xs font-medium text-\[var\(--muted\)\] mb-1\.5\">Date of Birth</label>)",
    "",
    content,
    flags=re.DOTALL
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("success")
