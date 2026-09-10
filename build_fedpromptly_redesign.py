from pathlib import Path

source = Path('/home/ubuntu/upload/pasted_content.txt').read_text()
override = '<link rel="stylesheet" href="fedpromptly-redesign.css" />'
if override not in source:
    source = source.replace('</head>', f'    {override}\n</head>', 1)
Path('/home/ubuntu/upload/fedpromptly-redesigned.html').write_text(source)
print('wrote /home/ubuntu/upload/fedpromptly-redesigned.html')
