---
layout: default
title: Report Archive
lang: en
---

# Report Archive

{% assign reports = site.pages | where_exp: "p", "p.path contains 'reports/en/'" | sort: "date" | reverse %}

{% if reports.size > 0 %}
<ul class="archive-list">
{% for report in reports %}
  <li><a href="{{ report.url | relative_url }}">{{ report.date }} — {{ report.title }}</a></li>
{% endfor %}
</ul>
{% else %}
*No reports yet.*
{% endif %}
