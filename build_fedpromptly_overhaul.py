from pathlib import Path

source = Path('/home/ubuntu/upload/pasted_content.txt').read_text()
override = Path('/home/ubuntu/upload/fedpromptly-overhaul.css').read_text()
style = '\n<style id="fedpromptly-overhaul-v3">\n' + override + '\n</style>\n'
source = source.replace('</head>', style + '</head>', 1)
Path('/home/ubuntu/upload/fedpromptly-overhaul.html').write_text(source)
print('wrote /home/ubuntu/upload/fedpromptly-overhaul.html')
