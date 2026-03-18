---
layout: default
title: 报告归档
lang: zh
---

# 报告归档

{% assign reports = site.pages | where_exp: "p", "p.path contains 'reports/zh/'" | sort: "date" | reverse %}

{% if reports.size > 0 %}
<ul class="archive-list">
{% for report in reports %}
  <li><a href="{{ report.url | relative_url }}">{{ report.date }} — {{ report.title }}</a></li>
{% endfor %}
</ul>
{% else %}
*暂无报告。*
{% endif %}
