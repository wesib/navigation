# Wesib: Navigation Support

[![NPM][npm-image]][npm-url]
[![Build Status][build-status-img]][build-status-link]
[![Code Quality][quality-img]][quality-link]
[![Coverage][coverage-img]][coverage-link]
[![GitHub Project][github-image]][github-url]
[![API Documentation][api-docs-image]][api-docs-url]

This module supports navigation utilizing browser [History API].

A `Navigation` instance available in bootstrap context tracks current `Page` and navigation event. It should be
used for navigation to another page.

A `NavigationAgent` provided for bootstrap context alters navigation processing or prevents it.

A `@RenderPage()`-decorated method is called when new page loaded and pre-rendered. The page is loaded when navigating
to another URL. The page (or only requested part of it) is loaded from the same URL. The decorated method may alter the
loaded page contents.

A `PageLoadAgent` provided for context can be used to alter document processing of the loaded document. E.g. the agents
provided by default:

- Add scripts from the loaded document if not present yet.

- Add styles from the loaded document, and removes the ones not present.

- Update window title.

- Reload the page if the loaded page revision differs from previously loaded one.

  The page revision is specified by `<meta name="wesib-app-rev" value="${rev}"/>` meta-tag.

A `NavLink`, `NavElement`, and `NavAnchor` instances can be used to make elements (such as `<a href="${url}">...</a>`)
navigate to target URL with `Nsvigation` API.

A `NavMenu` instance serves as an owner of navigation links and activates the links matching current page.

[npm-image]: https://img.shields.io/npm/v/@wesib/navigation.svg?logo=npm
[npm-url]: https://www.npmjs.com/package/@wesib/navigation
[build-status-img]: https://github.com/wesib/navigation/workflows/Build/badge.svg
[build-status-link]: https://github.com/wesib/navigation/actions?query=workflow:Build
[quality-img]: https://app.codacy.com/project/badge/Grade/a89af5e6c7f2437f8ca9ef68d930babc
[quality-link]: https://www.codacy.com/gh/wesib/navigation/dashboard?utm_source=github.com&utm_medium=referral&utm_content=wesib/navigation&utm_campaign=Badge_Grade
[coverage-img]: https://app.codacy.com/project/badge/Coverage/a89af5e6c7f2437f8ca9ef68d930babc
[coverage-link]: https://www.codacy.com/gh/wesib/navigation/dashboard?utm_source=github.com&utm_medium=referral&utm_content=wesib/navigation&utm_campaign=Badge_Coverage
[github-image]: https://img.shields.io/static/v1?logo=github&label=GitHub&message=project&color=informational
[github-url]: https://github.com/wesib/navigation
[api-docs-image]: https://img.shields.io/static/v1?logo=typescript&label=API&message=docs&color=informational
[api-docs-url]: https://wesib.github.io/navigation/
[history api]: https://developer.mozilla.org/en-US/docs/Web/API/History
