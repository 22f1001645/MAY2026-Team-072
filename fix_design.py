import re

with open('frontend/src/pages/EventDetail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Left column Card removal & spacing
# The left column starts with: <div className="space-y-6">
# We change it to <div className="space-y-12">
content = content.replace('<div className="space-y-6">', '<div className="space-y-12 pb-10">')

# We want to replace the Card wrappers on the left with a div.
# Looking for <Card className="p-6 md:p-8 bg-onyx/60 backdrop-blur-3xl border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
# and <Card className="p-6 md:p-8 bg-onyx/60 backdrop-blur-3xl border-teal/20 shadow-[0_8px_30px_rgba(92,230,201,0.08)]">
left_card_pattern = r'<Card className="p-6 md:p-8 bg-onyx/60 backdrop-blur-3xl[^>]*>'

def replace_card_start(match):
    return '<div>'

content = re.sub(left_card_pattern, replace_card_start, content)

# But wait, replacing </Card> is tricky because the right column also uses Card.
# Let's just do exact string replacements for the ends of the specific sections in the left column.
# Instead of Regex, we can use exact strings for the left side sections.
