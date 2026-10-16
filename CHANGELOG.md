# Changelog

## [0.7.0](https://github.com/ZachatorCodes/habit-bingo-v2/compare/habit-bingo-v0.6.0...habit-bingo-v0.7.0) (2026-10-16)


### Features

* **db:** month_result table ([8859a98](https://github.com/ZachatorCodes/habit-bingo-v2/commit/8859a98b5a4c8b3940ac5f3f0dc06d29c0895891))
* **groups:** M8 groups, invite links, leaderboards and member cards ([#89](https://github.com/ZachatorCodes/habit-bingo-v2/issues/89)) ([f8a2a5f](https://github.com/ZachatorCodes/habit-bingo-v2/commit/f8a2a5f52f32a13633355f699402d3cfedc0148c))
* **recap:** finalize finished months into month_result ([8f51d55](https://github.com/ZachatorCodes/habit-bingo-v2/commit/8f51d5506e078ff01eb429886d003a982d5067b4))
* **recap:** history of finished months ([9de9f2b](https://github.com/ZachatorCodes/habit-bingo-v2/commit/9de9f2b928ec81435d126f2fb95827ddb9acff13))
* **recap:** month finality, highlight and category rules ([efaace6](https://github.com/ZachatorCodes/habit-bingo-v2/commit/efaace6bc70e5e5bc8d654ae3794cd501f3527c1))
* **recap:** the month recap page ([9713d69](https://github.com/ZachatorCodes/habit-bingo-v2/commit/9713d69358c713d19f8903d73c7177617d9aab38))
* **today:** heads up nudges on Today ([3660277](https://github.com/ZachatorCodes/habit-bingo-v2/commit/3660277bbb2ff38647fb7707bca871a263424171))
* **today:** heads-up nudge rules ([c69ed71](https://github.com/ZachatorCodes/habit-bingo-v2/commit/c69ed71e065272de83bfefac33093306fa7c6c93))
* **today:** recap banner ([8b793a0](https://github.com/ZachatorCodes/habit-bingo-v2/commit/8b793a0af2bafe47d9a11479289ddce0e86eb72d))
* **today:** weekly habits get their own This week section with days left ([91bdcdf](https://github.com/ZachatorCodes/habit-bingo-v2/commit/91bdcdf76595d458315acb6f4ebe83f77fcba4af))


### Bug Fixes

* **card:** a non-numeric count on the habit sheet is refused, not a 500 ([#83](https://github.com/ZachatorCodes/habit-bingo-v2/issues/83)) ([1ba1aff](https://github.com/ZachatorCodes/habit-bingo-v2/commit/1ba1aff06ff5b93b8df7ee5165fba7ca486979f9))
* **recap:** a late next card never counts the center; hovering a recap link doesn't mark it seen ([c2befb3](https://github.com/ZachatorCodes/habit-bingo-v2/commit/c2befb3afdf6cdcac29596f1fadce4235fdf29df))
* **today:** last month's last days can be logged on the 1st–3rd ([0d9be65](https://github.com/ZachatorCodes/habit-bingo-v2/commit/0d9be65d3fdebe7fc36c6fbee42711736cf0a0ac))
* **today:** reward nudges only in the card's last 7 days ([#88](https://github.com/ZachatorCodes/habit-bingo-v2/issues/88)) ([1bf265e](https://github.com/ZachatorCodes/habit-bingo-v2/commit/1bf265e731ed4c2391ac5e48a86a2888c017b21f))

## [0.6.0](https://github.com/ZachatorCodes/habit-bingo-v2/compare/habit-bingo-v0.5.0...habit-bingo-v0.6.0) (2026-10-13)


### Features

* **card:** BINGO! ([#81](https://github.com/ZachatorCodes/habit-bingo-v2/issues/81)) ([f26fe5f](https://github.com/ZachatorCodes/habit-bingo-v2/commit/f26fe5f219699c973ccc78276f1ebdee47ef93b2))
* **card:** named squares with soft tints and border styles ([#78](https://github.com/ZachatorCodes/habit-bingo-v2/issues/78)) ([0e8e8f2](https://github.com/ZachatorCodes/habit-bingo-v2/commit/0e8e8f21536629bb410926b107fb281528563b7d))
* **card:** the card header ([#79](https://github.com/ZachatorCodes/habit-bingo-v2/issues/79)) ([91ebb70](https://github.com/ZachatorCodes/habit-bingo-v2/commit/91ebb70f6ecd2281c05bf49284027c184b4a7cbc))
* **card:** the habit sheet ([#80](https://github.com/ZachatorCodes/habit-bingo-v2/issues/80)) ([477af85](https://github.com/ZachatorCodes/habit-bingo-v2/commit/477af8570b3d6b73cc5c1edcac9a995e428430ef))
* **game:** lines, reward tiers and points ([#77](https://github.com/ZachatorCodes/habit-bingo-v2/issues/77)) ([5232acf](https://github.com/ZachatorCodes/habit-bingo-v2/commit/5232acfaa28017b20103a40d1b3730fa6f885b9f))
* **habits:** tidier habit form and deleting archived habits ([#73](https://github.com/ZachatorCodes/habit-bingo-v2/issues/73)) ([c00b07a](https://github.com/ZachatorCodes/habit-bingo-v2/commit/c00b07a8b01b7ea0ac03dc6bf03aa0575e86e9b7))

## [0.5.0](https://github.com/ZachatorCodes/habit-bingo-v2/compare/habit-bingo-v0.4.0...habit-bingo-v0.5.0) (2026-10-13)


### Features

* **check-ins:** check-in table, service and live card squares ([#69](https://github.com/ZachatorCodes/habit-bingo-v2/issues/69)) ([c7941e8](https://github.com/ZachatorCodes/habit-bingo-v2/commit/c7941e81c1fff60ff7a5af0f6383505f68667eb7))
* **game:** clipped weeks and the backfill window ([#66](https://github.com/ZachatorCodes/habit-bingo-v2/issues/66)) ([6e5e2f0](https://github.com/ZachatorCodes/habit-bingo-v2/commit/6e5e2f0828e0db9e8db5b833d822ce1b8ebfff08))
* **game:** live square states and the Today grouping ([#67](https://github.com/ZachatorCodes/habit-bingo-v2/issues/67)) ([06b79ff](https://github.com/ZachatorCodes/habit-bingo-v2/commit/06b79ff17319d02bd83d6c7687bc38e39ecf3ca2))
* **today:** pop & burst and optimistic logging ([#71](https://github.com/ZachatorCodes/habit-bingo-v2/issues/71)) ([e05ee1c](https://github.com/ZachatorCodes/habit-bingo-v2/commit/e05ee1cfac37d60cc555c272afd871d6688a1b1a))
* **today:** the Today screen ([#70](https://github.com/ZachatorCodes/habit-bingo-v2/issues/70)) ([042d1f0](https://github.com/ZachatorCodes/habit-bingo-v2/commit/042d1f05a2ab2fcdddf125d0a8e10a447f481ecc))


### Bug Fixes

* **today:** logging keeps your place on the page ([#72](https://github.com/ZachatorCodes/habit-bingo-v2/issues/72)) ([022c5c4](https://github.com/ZachatorCodes/habit-bingo-v2/commit/022c5c4378e3754de4083c09dc1e6b4c3871120e))

## [0.4.0](https://github.com/ZachatorCodes/habit-bingo-v2/compare/habit-bingo-v0.3.0...habit-bingo-v0.4.0) (2026-10-13)


### Features

* **cards:** 3×3 cards get a center square ([#61](https://github.com/ZachatorCodes/habit-bingo-v2/issues/61)) ([d1fd8cc](https://github.com/ZachatorCodes/habit-bingo-v2/commit/d1fd8ccbda72afb505bb7d19c91f1a2434f329d6))
* **cards:** board preview, start and the card page ([#58](https://github.com/ZachatorCodes/habit-bingo-v2/issues/58)) ([122321b](https://github.com/ZachatorCodes/habit-bingo-v2/commit/122321bafef81e8317752f3be7e5e43c8eb06795))
* **cards:** builder drafts, size and habits steps ([#56](https://github.com/ZachatorCodes/habit-bingo-v2/issues/56)) ([b9386b9](https://github.com/ZachatorCodes/habit-bingo-v2/commit/b9386b98d0310516bbf51b6d736fdf4326f164eb))
* **cards:** card tables and card service ([#54](https://github.com/ZachatorCodes/habit-bingo-v2/issues/54)) ([4e3684c](https://github.com/ZachatorCodes/habit-bingo-v2/commit/4e3684c826b88a0893ebe491db1098db0c91d5b3))
* **cards:** drafts per month and next month's card ([#63](https://github.com/ZachatorCodes/habit-bingo-v2/issues/63)) ([14c9800](https://github.com/ZachatorCodes/habit-bingo-v2/commit/14c98000665cd671c286f4a802df3f442b7f03cc))
* **cards:** edit a card within 48 hours ([#59](https://github.com/ZachatorCodes/habit-bingo-v2/issues/59)) ([1cc3d68](https://github.com/ZachatorCodes/habit-bingo-v2/commit/1cc3d68ed8da45d543de38b327025085f433c542))
* **cards:** next-month rules and a test clock ([#62](https://github.com/ZachatorCodes/habit-bingo-v2/issues/62)) ([26e487f](https://github.com/ZachatorCodes/habit-bingo-v2/commit/26e487f30444710df88aa991358c4efeaf3edc8c))
* **cards:** targets and rewards steps ([#57](https://github.com/ZachatorCodes/habit-bingo-v2/issues/57)) ([30e18c9](https://github.com/ZachatorCodes/habit-bingo-v2/commit/30e18c9b7b8ec044e7f28237698e2dc5925b1c9c))
* **cards:** the center square leads to next month's card ([#64](https://github.com/ZachatorCodes/habit-bingo-v2/issues/64)) ([bd49c04](https://github.com/ZachatorCodes/habit-bingo-v2/commit/bd49c041ccd79012cd88c09eadd6ab1379871d54))
* **game:** card sizes, proration and month arithmetic ([#53](https://github.com/ZachatorCodes/habit-bingo-v2/issues/53)) ([33040c5](https://github.com/ZachatorCodes/habit-bingo-v2/commit/33040c56dabe23216ec5b7fdf0d999495a9a03cf))

## [0.3.0](https://github.com/ZachatorCodes/habit-bingo-v2/compare/habit-bingo-v0.2.0...habit-bingo-v0.3.0) (2026-10-12)


### Features

* **game:** habit rules and categories ([#42](https://github.com/ZachatorCodes/habit-bingo-v2/issues/42)) ([059b342](https://github.com/ZachatorCodes/habit-bingo-v2/commit/059b3420e0df3081d063bef7c4f798dc8e8f48ec))
* **habits:** allow per-day limits ([#51](https://github.com/ZachatorCodes/habit-bingo-v2/issues/51)) ([dee6ce0](https://github.com/ZachatorCodes/habit-bingo-v2/commit/dee6ce0483cd8710c0049b604feb9e9eb02d5ccc))
* **habits:** create and edit habits ([#46](https://github.com/ZachatorCodes/habit-bingo-v2/issues/46)) ([ff875ce](https://github.com/ZachatorCodes/habit-bingo-v2/commit/ff875ce7316c6b76aaf17789774407af4de6de85))
* **habits:** habit library page ([#45](https://github.com/ZachatorCodes/habit-bingo-v2/issues/45)) ([312dd6c](https://github.com/ZachatorCodes/habit-bingo-v2/commit/312dd6c202373cce6912a518de3253800fdeae4c))
* **habits:** habit table and library service ([#43](https://github.com/ZachatorCodes/habit-bingo-v2/issues/43)) ([fff1fe9](https://github.com/ZachatorCodes/habit-bingo-v2/commit/fff1fe94b58e232dba9365f33ae24b67f08cc786))
* **habits:** quick start suggestions after onboarding ([#49](https://github.com/ZachatorCodes/habit-bingo-v2/issues/49)) ([c7c8b0c](https://github.com/ZachatorCodes/habit-bingo-v2/commit/c7c8b0c04e2dea96afaa6bd6eba6e59c88561f11))


### Bug Fixes

* **a11y:** avatar errors, banner landmark and reset username field ([#48](https://github.com/ZachatorCodes/habit-bingo-v2/issues/48)) ([662774d](https://github.com/ZachatorCodes/habit-bingo-v2/commit/662774dd7c93294c58be59719e11a510b99d78a9))

## [0.2.0](https://github.com/ZachatorCodes/habit-bingo-v2/compare/habit-bingo-v0.1.1...habit-bingo-v0.2.0) (2026-10-12)


### Features

* **admin:** invites, password-reset links and the reset page ([#37](https://github.com/ZachatorCodes/habit-bingo-v2/issues/37)) ([622ad73](https://github.com/ZachatorCodes/habit-bingo-v2/commit/622ad735e9dad0499fa54b4bdd193beb62dfbf9d))
* **auth:** add the auth data model and Better Auth wiring ([#29](https://github.com/ZachatorCodes/habit-bingo-v2/issues/29)) ([ec1d92a](https://github.com/ZachatorCodes/habit-bingo-v2/commit/ec1d92a8c59947aedead616a0f7b6a91eb76fb6c))
* **auth:** continue with Google on sign-in and invite pages ([#35](https://github.com/ZachatorCodes/habit-bingo-v2/issues/35)) ([cd98ed4](https://github.com/ZachatorCodes/habit-bingo-v2/commit/cd98ed481b655f5d73b9cc1903b156d3862ce520))
* **auth:** enforce the password policy, breach check and invites ([#31](https://github.com/ZachatorCodes/habit-bingo-v2/issues/31)) ([3a998a5](https://github.com/ZachatorCodes/habit-bingo-v2/commit/3a998a55f4ff3a358e280a40ac4a8d2343b1bce0))
* **auth:** join with an invite and seed E2E accounts ([#32](https://github.com/ZachatorCodes/habit-bingo-v2/issues/32)) ([1c95e2c](https://github.com/ZachatorCodes/habit-bingo-v2/commit/1c95e2c5151ca583db3bf6e7b29692b54ac6b87f))
* **auth:** sign in, sign out and the signed-in app shell ([#33](https://github.com/ZachatorCodes/habit-bingo-v2/issues/33)) ([43eb4c5](https://github.com/ZachatorCodes/habit-bingo-v2/commit/43eb4c5e73e1883eaa2a0d48f2f37cef4f6f74db))
* **me:** profile, settings, passwords, sign-in methods and account deletion ([#36](https://github.com/ZachatorCodes/habit-bingo-v2/issues/36)) ([bcf589b](https://github.com/ZachatorCodes/habit-bingo-v2/commit/bcf589b77f46a16b14735d1797bd2a853113dd0c))
* **onboarding:** first-run profile setup with an accessible emoji picker ([#34](https://github.com/ZachatorCodes/habit-bingo-v2/issues/34)) ([9912e1b](https://github.com/ZachatorCodes/habit-bingo-v2/commit/9912e1ba1cb0aa8cbf0fd53a53975d9e9a67bb1d))


### Bug Fixes

* **auth:** honor the bootstrap invite code on the join page ([#39](https://github.com/ZachatorCodes/habit-bingo-v2/issues/39)) ([410cf01](https://github.com/ZachatorCodes/habit-bingo-v2/commit/410cf01b2a287cc5267f4046025b6be370a2d10b))

## [0.1.1](https://github.com/ZachatorCodes/habit-bingo-v2/compare/habit-bingo-v0.1.0...habit-bingo-v0.1.1) (2026-10-09)


### Bug Fixes

* address M0 review minor findings ([#24](https://github.com/ZachatorCodes/habit-bingo-v2/issues/24)) ([4d3397c](https://github.com/ZachatorCodes/habit-bingo-v2/commit/4d3397c06988dd7c7f7dad804400c2158a311fd3))

## 0.1.0 (2026-10-09)


### Features

* add database client and /api/health endpoint ([#4](https://github.com/ZachatorCodes/habit-bingo-v2/issues/4)) ([0b761cb](https://github.com/ZachatorCodes/habit-bingo-v2/commit/0b761cb4a5107b7df9454cf162a9748a5d44535b))
* add landing, privacy and terms pages with cookie notice ([#6](https://github.com/ZachatorCodes/habit-bingo-v2/issues/6)) ([69dafa0](https://github.com/ZachatorCodes/habit-bingo-v2/commit/69dafa0662f94c009cd9868bcedec227bc2a3f87))
* add Playful design tokens, Button and BingoSquare ([#5](https://github.com/ZachatorCodes/habit-bingo-v2/issues/5)) ([74233ef](https://github.com/ZachatorCodes/habit-bingo-v2/commit/74233efa66f783f29f55a42bb6db1b540eac8106))
* add PWA manifest and app icons ([#10](https://github.com/ZachatorCodes/habit-bingo-v2/issues/10)) ([c2c2973](https://github.com/ZachatorCodes/habit-bingo-v2/commit/c2c2973d3b6741c936f0824efc091b2dbd1d7331))
* add security headers, CSP, and friendly error pages ([#8](https://github.com/ZachatorCodes/habit-bingo-v2/issues/8)) ([e32b426](https://github.com/ZachatorCodes/habit-bingo-v2/commit/e32b4266fae8a1f3cbce5fcad6569d7fc1da6bf5))
* serve sitemap.xml and robots.txt ([#7](https://github.com/ZachatorCodes/habit-bingo-v2/issues/7)) ([ad975b3](https://github.com/ZachatorCodes/habit-bingo-v2/commit/ad975b39f02b80a49332f659c4104bcededc3a4f))
