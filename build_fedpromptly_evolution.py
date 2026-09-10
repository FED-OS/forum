from pathlib import Path

source = Path('/home/ubuntu/upload/pasted_content.txt').read_text()
link = '<link rel="stylesheet" href="fedpromptly-evolution.css" />'
source = source.replace('</head>', f'    {link}\n</head>', 1)
Path('/home/ubuntu/upload/fedpromptly-evolution.html').write_text(source)
print('wrote /home/ubuntu/upload/fedpromptly-evolution.html')
