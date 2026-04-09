with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = '} catch (e) { alert("Lỗi gửi báo cáo"); } finally { setIsReporting(false); setRecordingProgress(0); }'
new_str = '} catch (e) { console.error("Lỗi gửi báo cáo:", e); alert("Lỗi gửi báo cáo: " + (e.message || String(e))); } finally { setIsReporting(false); setRecordingProgress(0); }'

if old_str in content:
    content = content.replace(old_str, new_str)
    with open('components/GCodeViewer.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added detailed error logging to handleSendReport")
else:
    print("Could not find exact string")
