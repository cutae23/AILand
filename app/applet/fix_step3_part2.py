import sys

target_file = 'src/components/Step3Scenario.tsx'

# Read the file
with open(target_file, 'rb') as f:
    content = f.read()

# We want to find the line starting with "                    </tbody>order border-gray-300"
# and delete everything from there up to the end of the redundant table.
# Let's find the start index
start_marker = b'                    </tbody>order border-gray-300'
start_idx = content.find(start_marker)

if start_idx == -1:
    print("ERROR: Start marker not found.")
    sys.exit(1)

# Now, we find the end of the redundant table. 
# The redundant table ends with:
#                     </tbody>
#                   </table>
#                 </div>
#                 <p className="text-[9.5px] text-[#8D7B68] italic">
# Let's locate this exact footer.
end_marker = b'                    </tbody>\n                  </table>\n                </div>\n                <p className="text-[9.5px]'
end_idx = content.find(end_marker, start_idx)

if end_idx == -1:
    print("ERROR: End marker not found.")
    sys.exit(1)

# We want to keep everything from start of file to start_idx,
# then insert:
#                     </tbody>
#                   </table>
#                 </div>
# and then append everything from end_idx + length of target table closing (which is lines 2254-2256).
# Wait, let's look at the markers.
# Since end_marker contains:
#                     </tbody>\n                  </table>\n                </div>\n                <p className="text-[9.5px]'
# We want to replace everything between start_idx and the start of the <p className="text-[9.5px]"> tag.
# So we want the replacement to be:
#                     </tbody>\n                  </table>\n                </div>\n
# and we start the remainder of the file at the <p className="text-[9.5px]"> tag itself!

p_tag_marker = b'<p className="text-[9.5px]'
p_tag_idx = content.find(p_tag_marker, start_idx)

if p_tag_idx == -1:
    print("ERROR: p tag marker not found.")
    sys.exit(1)

replacement = b'                    </tbody>\n                  </table>\n                </div>\n              '

new_content = content[:start_idx] + replacement + content[p_tag_idx:]

with open(target_file, 'wb') as f:
    f.write(new_content)

print("SUCCESS: Duplicate and corrupted table rows cleaned up successfully.")
