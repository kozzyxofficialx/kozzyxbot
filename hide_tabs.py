import sys

def update_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    tabs_to_hide = ['data-page="automod"', 'data-page="tickets"', 'data-page="scheduled"', 'data-page="ai"', 'data-page="config"', 'data-page="deploy"']
    
    for i, line in enumerate(lines):
        for tab in tabs_to_hide:
            if tab in line and '<a class="nav-item"' in line:
                # hide the link
                lines[i] = line.replace('<a class="nav-item"', '<a class="nav-item" style="display:none"')
                
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

update_file('dashboard.html')
