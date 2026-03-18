file_path = r'src/app/login/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False

for i, line in enumerate(lines):
    # 1. Skip state vars
    if 'const [admissionNumber, setAdmissionNumber] = useState' in line: continue
    if 'const [department, setDepartment] = useState' in line: continue
    if 'const [yearLevel, setYearLevel] = useState' in line: continue
    
    # 2. Skip auto-fill block
    if '// Auto-fill fields' in line: continue
    if 'setAdmissionNumber(result.parsed.admissionNumber);' in line: continue
    if 'setDepartment(result.parsed.department);' in line: continue
    if 'setYearLevel(result.parsed.yearLevel);' in line: continue
    
    # 3. Replace payload variables inside verifyOtpAndProceed
    if 'admissionNumber: admissionNumber.trim().toUpperCase(),' in line:
        new_lines.append(line.replace('admissionNumber.trim().toUpperCase()', \"parsedEmail?.admissionNumber || ''\"))
        continue
    if 'department,' in line and '          department,' in line:
        new_lines.append(line.replace('department,', \"department: parsedEmail?.department || '',\"))
        continue
    if 'yearLevel,' in line and '          yearLevel,' in line:
        new_lines.append(line.replace('yearLevel,', \"yearLevel: parsedEmail?.yearLevel || '',\"))
        continue
        
    # 4. Handle validations inside handleSubmit
    if 'if (!admissionNumber.trim() && !parsedEmail)' in line: continue
    if 'if (!department && !parsedEmail)' in line: continue
    if 'if (!yearLevel && !parsedEmail)' in line:
        # replace the last skipped line with our combined one
        new_lines.append(\"      if (!parsedEmail) { setError('Please enter a valid student email address'); return; }\\n\")
        continue
        
    # 5. Skip the entire JSX manual block
    if '{/* Manual fields only if email not parsed */}' in line:
        skip = True
        continue
        
    if skip:
        # Stop skipping when we hit the Date of Birth block
        if '{isSignup && (' in line and 'Date of Birth' in lines[i+2]:
            skip = False
        else:
            continue
            
    # Default: keep line
    if not skip:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("done")
