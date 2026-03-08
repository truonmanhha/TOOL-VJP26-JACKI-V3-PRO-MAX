import re

with open('components/ChatBot.tsx', 'r') as f:
    content = f.read()

# Replace the Google Proxy string with the actual button handling
# Find the exact text `<span className="text-[17px]">Google Proxy</span>`

# We need to make the Google Proxy div clickable, and when clicked, trigger a Google Login or show connected state.
# Let's change the text from "Chưa kết nối" to "Đã kết nối" if proxyConnected is true.
# And add an onClick handler to that container.

search_block = """<span className="text-[17px]">Google Proxy</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[17px] text-white/40">Chưa kết nối</span>"""

replace_block = """<span className="text-[17px]">Google Proxy</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[17px] ${proxyConnected ? 'text-[#34C759]' : 'text-white/40'}`}>
                          {proxyConnected ? 'Đã kết nối' : 'Chưa kết nối'}
                        </span>"""

content = content.replace(search_block, replace_block)

# Add onClick to the container
search_container = """<div className="rounded-xl overflow-hidden mb-8">
                    <div className="flex items-center justify-between px-3 py-2 bg-[#1C1C1E] active:bg-neutral-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-7 rounded-full bg-white flex items-center justify-center overflow-hidden">
                          <svg"""

replace_container = """<div className="rounded-xl overflow-hidden mb-8">
                    <div onClick={() => setProxyConnected(!proxyConnected)} className="flex items-center justify-between px-3 py-2 bg-[#1C1C1E] active:bg-neutral-800 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="size-7 rounded-full bg-white flex items-center justify-center overflow-hidden">
                          <svg"""

content = content.replace(search_container, replace_container)

with open('components/ChatBot.tsx', 'w') as f:
    f.write(content)
print("Added Google Proxy logic")
