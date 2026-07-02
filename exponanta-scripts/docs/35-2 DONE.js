C:\Windows\System32>cd C:\python\script\exponanta-scripts\coworker-refactor-35

C:\python\script\exponanta-scripts\coworker-refactor-35>powershell
Windows PowerShell
Copyright (C) Microsoft Corporation. All rights reserved.

Install the latest PowerShell for new features and improvements! https://aka.ms/PSWindows

PS C:\python\script\exponanta-scripts\coworker-refactor-35> Get-ChildItem -File | ForEach-Object {
>>     (Get-Content $_.FullName) -replace '\bwindow\.', 'globalThis.' | Set-Content $_.FullName
>> }
>>
PS C:\python\script\exponanta-scripts\coworker-refactor-35>