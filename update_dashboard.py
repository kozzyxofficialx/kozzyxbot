import sys

def update_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 1. Members
    start_members = 3082 # 0-indexed (line 3083 is <tbody>)
    end_members = 3181 # 0-indexed (line 3182 is </tbody>)
    lines[start_members] = '                                <tbody id="members-list">\n'
    for i in range(start_members + 1, end_members):
        lines[i] = ''
    
    # 2. Roles
    start_roles = 3402
    end_roles = 3488
    lines[start_roles] = '                                <tbody id="roles-list">\n'
    for i in range(start_roles + 1, end_roles):
        lines[i] = ''

    # 3. Channels
    start_channels = 3500 # line 3501 is <div class="card">
    end_channels = 3566 # line 3567 is </section>
    lines[start_channels] = '                    <div class="card" id="channels-list" style="padding:20px;"></div>\n'
    for i in range(start_channels + 1, end_channels):
        lines[i] = ''

    # 4. Commands
    start_commands = 3740 # line 3741 is <div class="grid" style="gap:10px">
    end_commands = 3797 # line 3798 is </div>
    lines[start_commands] = '                    <div class="grid" style="gap:10px" id="commands-list"></div>\n'
    for i in range(start_commands + 1, end_commands):
        lines[i] = ''

    # 5. Modlog
    start_modlog_list = 3201 # <div style="display:flex; flex-direction:column; gap:10px">
    end_modlog_list = 3244
    lines[start_modlog_list] = '                    <div style="display:flex; flex-direction:column; gap:10px" id="modlog-list"></div>\n'
    for i in range(start_modlog_list + 1, end_modlog_list):
        lines[i] = ''

    # 6. Messaging Select
    msg_select_start = 3582 # <select class="select" style="margin-bottom: 14px;">
    msg_select_end = 3588 # </select>
    lines[msg_select_start] = '                            <select class="select" id="message-channel-select" style="margin-bottom: 14px;"></select>\n'
    for i in range(msg_select_start + 1, msg_select_end):
        lines[i] = ''

    # 7. Messaging Send button onClick
    send_btn_line = 3611 # <button class="btn primary" onclick="toast('Message sent to channel', 'ok')">
    lines[send_btn_line] = lines[send_btn_line].replace("toast('Message sent to channel', 'ok')", "sendMessage()")

    # 8. Append JS code
    js_code = """
        // --- REAL DATA FETCHING ---
        async function refreshMembers() {
            try {
                const members = await apiFetch('/api/members');
                const tbody = document.getElementById('members-list');
                if (!tbody) return;
                tbody.innerHTML = '';
                document.querySelector('[data-page="members"] .chip.active .count').textContent = members.length;
                members.forEach(m => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <div class="user-pill">
                                <div class="avatar" style="background: var(--accent)">
                                    ${m.avatar ? `<img src="${m.avatar}" style="width:100%;height:100%;border-radius:50%">` : m.username.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                    <div class="uname">${m.username} ${m.bot ? '<span class="role-chip" style="font-size:9px;padding:1px 4px;margin-left:4px">BOT</span>' : ''}</div>
                                    <div class="uhandle">${m.tag} &middot; ${m.id}</div>
                                </div>
                            </div>
                        </td>
                        <td>${m.roles.slice(0,3).map(r => `<span class="role-pill" style="--role-color: ${r.color !== '#000000' ? r.color : 'var(--fg-dim)'}">${r.name}</span>`).join(' ')}${m.roles.length > 3 ? ` <span class="role-pill">+${m.roles.length-3}</span>` : ''}</td>
                        <td class="mono" style="font-size:12px">${new Date(m.joinedAt).toLocaleDateString()}</td>
                        <td><span style="color:var(--ok); font-size:12px" class="mono">--</span></td>
                        <td style="text-align:right"><button class="btn sm ghost">Manage</button></td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) { console.error('Failed to fetch members:', err); }
        }

        async function refreshRoles() {
            try {
                const roles = await apiFetch('/api/roles');
                const tbody = document.getElementById('roles-list');
                if (!tbody) return;
                tbody.innerHTML = '';
                roles.forEach(r => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><span class="role-pill" style="--role-color: ${r.color !== '#000000' ? r.color : 'var(--fg-dim)'}">${r.name}</span></td>
                        <td class="mono num">${r.members}</td>
                        <td style="font-size:12px; color:var(--fg-dim)">Pos: ${r.position} ${r.hoist ? '(Hoisted)' : ''}</td>
                        <td>
                            <div style="width:18px; height:18px; border-radius:4px; background: ${r.color !== '#000000' ? r.color : 'var(--bg-elev-3)'}"></div>
                        </td>
                        <td style="text-align:right"><button class="btn sm ghost">Edit</button></td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) { console.error('Failed to fetch roles:', err); }
        }

        async function refreshChannels() {
            try {
                const channels = await apiFetch('/api/channels');
                const list = document.getElementById('channels-list');
                const select = document.getElementById('message-channel-select');
                if (!list || !select) return;
                
                list.innerHTML = '';
                select.innerHTML = '<option value="">Select a channel...</option>';
                
                // Sort by position
                channels.sort((a, b) => a.position - b.position);
                
                const categories = channels.filter(c => c.type === 4);
                const textChannels = channels.filter(c => c.type === 0);
                const voiceChannels = channels.filter(c => c.type === 2);
                
                const getIcon = (type) => {
                    if (type === 0) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`;
                    if (type === 2) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
                    return '';
                };

                const renderChannel = (c) => {
                    if (c.type === 0) select.innerHTML += `<option value="${c.id}">#${c.name}</option>`;
                    return `<div class="ch-item">${getIcon(c.type)} ${c.name}</div>`;
                };

                categories.forEach(cat => {
                    list.innerHTML += `<div class="ch-cat">${cat.name.toUpperCase()}</div>`;
                    const children = channels.filter(c => c.parentId === cat.id && (c.type === 0 || c.type === 2));
                    children.forEach(c => {
                        list.innerHTML += renderChannel(c);
                    });
                });
                
                // Uncategorized
                const uncategorized = channels.filter(c => !c.parentId && (c.type === 0 || c.type === 2));
                if (uncategorized.length > 0) {
                    list.innerHTML += `<div class="ch-cat">UNCATEGORIZED</div>`;
                    uncategorized.forEach(c => {
                        list.innerHTML += renderChannel(c);
                    });
                }
            } catch (err) { console.error('Failed to fetch channels:', err); }
        }

        async function refreshCommands() {
            try {
                const data = await apiFetch('/api/commands');
                const list = document.getElementById('commands-list');
                if (!list) return;
                list.innerHTML = '';
                
                document.querySelector('[data-page="commands"] .chip.active .count').textContent = data.slash.length + data.prefix.length;

                data.slash.forEach(cmd => {
                    list.innerHTML += `
                        <div class="cmd-card">
                            <div>
                                <div class="cmd-name">/${cmd.name} <span class="role-chip" style="font-size:9px;padding:1px 4px;margin-left:4px">Slash</span></div>
                                <div class="cmd-desc">${cmd.description}</div>
                            </div>
                            <div class="cmd-usage">-- uses &middot; 7d</div><button class="btn sm">Edit</button>
                        </div>
                    `;
                });
                data.prefix.forEach(cmd => {
                    list.innerHTML += `
                        <div class="cmd-card">
                            <div>
                                <div class="cmd-name">,${cmd.name} <span class="role-chip" style="font-size:9px;padding:1px 4px;margin-left:4px">Prefix</span></div>
                                <div class="cmd-desc">${cmd.description}</div>
                            </div>
                            <div class="cmd-usage">Aliases: ${cmd.aliases.join(', ') || 'None'}</div><button class="btn sm">Edit</button>
                        </div>
                    `;
                });
            } catch (err) { console.error('Failed to fetch commands:', err); }
        }

        async function refreshModlogs() {
            try {
                const logs = await apiFetch('/api/modlogs');
                const list = document.getElementById('modlog-list');
                if (!list) return;
                list.innerHTML = '';
                
                logs.forEach(log => {
                    const actionMap = { 20: 'Kicked', 22: 'Banned', 23: 'Unbanned', 24: 'Kicked', 40: 'Channel Created', 41: 'Channel Updated', 42: 'Channel Deleted' };
                    const actionStr = actionMap[log.action] || `Action ${log.action}`;
                    
                    list.innerHTML += `
                        <div class="feed-item">
                            <div class="feed-icon warn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            </div>
                            <div class="feed-content">
                                <div class="feed-title"><b>${log.executor ? log.executor.tag : 'System'}</b> ${actionStr} <b>${log.target ? log.target.tag || log.target.username : 'Unknown'}</b></div>
                                <div class="feed-time">${new Date(log.createdAt).toLocaleString()} &middot; Reason: ${log.reason || 'None'}</div>
                            </div>
                        </div>
                    `;
                });
            } catch (err) { console.error('Failed to fetch modlogs:', err); }
        }

        async function sendMessage() {
            const channelId = document.getElementById('message-channel-select').value;
            const content = document.getElementById('msg-body').value;
            
            if (!channelId) {
                toast('Please select a channel', 'error');
                return;
            }
            if (!content.trim()) {
                toast('Message cannot be empty', 'error');
                return;
            }
            
            try {
                await apiFetch('/api/message', {
                    method: 'POST',
                    body: JSON.stringify({ channelId, content })
                });
                toast('Message sent to channel', 'ok');
                document.getElementById('msg-body').value = '';
            } catch (err) {
                toast('Failed to send message', 'error');
                console.error(err);
            }
        }
"""

    # Add the new JS code before the final script tags
    end_script = 4404 # window.onload = () => {
    
    # Also add the calls to initDashboard
    # Find initDashboard
    init_dashboard_end = 4314 # refreshLogs();
    
    lines.insert(init_dashboard_end + 1, "            refreshMembers(); refreshRoles(); refreshChannels(); refreshCommands(); refreshModlogs();\n")
    
    # Insert new functions
    # Because we added a line above, end_script shifts down by 1
    lines.insert(end_script + 1, js_code)

    # Let's write it back
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

update_file('dashboard.html')
