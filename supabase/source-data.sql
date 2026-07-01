SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict Q0YCE3JJkqMLLYQtoKxOkGnm68Y9ajpi1yEdtg5tjTqpwwRNjKE6Admc9YHJFur

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'f3fe2f70-a103-4d6b-9aa2-4415d9d88bc9', 'authenticated', 'authenticated', 'test2@example.com', '$2a$10$2CH2vwGFd9VQ/jkaiQZYJuyZBC2z3Yz9G0zoP8UrT/OK/Ob2YLdu2', '2026-03-31 06:18:06.592895+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-07 02:15:32.522772+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-31 06:18:06.568415+00', '2026-05-12 12:55:53.344452+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'a485b432-0dda-4013-b99a-8078418ece9d', 'authenticated', 'authenticated', 'outcast@example.com', '$2a$10$6OLN6DV6aq8VbA3IsJYyju3lM6nbTVSQ4d4y2NVh060c9mgagkile', '2026-04-16 08:22:13.891957+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-19 23:53:07.050014+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-04-16 08:22:13.863594+00', '2026-05-21 03:54:38.573897+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', 'authenticated', 'authenticated', 'master@example.com', '$2a$10$TuKD/hRcr2nzxR4IwpFKrO8zCEN4FjZALdzjmN4TdXTb338hupgWO', '2026-03-31 05:01:34.140693+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-19 23:49:26.018726+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-31 05:01:34.126918+00', '2026-04-19 23:49:26.056517+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'ece67739-c917-4f35-b15b-fd9c65cdb019', 'authenticated', 'authenticated', 'test@example.com', '$2a$10$kcfnCktcbT3gke0Cnz2qrOglN2E5QcFJ4YHKtdh8c4cOL21KcjXEm', '2026-03-30 06:38:04.467285+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-07-01 06:05:29.851213+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-30 06:38:04.449511+00', '2026-07-01 07:23:33.411737+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('ece67739-c917-4f35-b15b-fd9c65cdb019', 'ece67739-c917-4f35-b15b-fd9c65cdb019', '{"sub": "ece67739-c917-4f35-b15b-fd9c65cdb019", "email": "test@example.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-30 06:38:04.460934+00', '2026-03-30 06:38:04.460984+00', '2026-03-30 06:38:04.460984+00', 'b07ce467-5892-48b5-b547-6fe1892ca239'),
	('ab63bf10-3cf3-4164-8aef-5429fc776eb6', 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', '{"sub": "ab63bf10-3cf3-4164-8aef-5429fc776eb6", "email": "master@example.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-31 05:01:34.136285+00', '2026-03-31 05:01:34.136336+00', '2026-03-31 05:01:34.136336+00', 'cdf8ceb8-c6bf-4872-b9dc-164f514c3ca1'),
	('f3fe2f70-a103-4d6b-9aa2-4415d9d88bc9', 'f3fe2f70-a103-4d6b-9aa2-4415d9d88bc9', '{"sub": "f3fe2f70-a103-4d6b-9aa2-4415d9d88bc9", "email": "test2@example.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-31 06:18:06.581944+00', '2026-03-31 06:18:06.582154+00', '2026-03-31 06:18:06.582154+00', 'f0b00c20-5403-4982-9412-dbaca737d869'),
	('a485b432-0dda-4013-b99a-8078418ece9d', 'a485b432-0dda-4013-b99a-8078418ece9d', '{"sub": "a485b432-0dda-4013-b99a-8078418ece9d", "email": "outcast@example.com", "email_verified": false, "phone_verified": false}', 'email', '2026-04-16 08:22:13.875261+00', '2026-04-16 08:22:13.875319+00', '2026-04-16 08:22:13.875319+00', 'd027ebc9-4eb7-400e-89dc-cd0cee1841e3');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('e77b2efe-88b8-4caa-a71a-44660e05489d', 'a485b432-0dda-4013-b99a-8078418ece9d', '2026-04-19 23:53:07.050124+00', '2026-05-21 03:54:38.580604+00', NULL, 'aal1', NULL, '2026-05-21 03:54:38.580477', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '138.64.248.55', NULL, NULL, NULL, NULL, NULL),
	('35d19cdb-c899-4c08-80ae-8efb76496581', 'a485b432-0dda-4013-b99a-8078418ece9d', '2026-04-17 02:26:32.671907+00', '2026-04-17 02:26:32.671907+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '126.219.233.5', NULL, NULL, NULL, NULL, NULL),
	('9e50b33f-c06e-41cb-a483-c8cf9b618919', 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', '2026-04-19 23:49:26.018825+00', '2026-04-19 23:49:26.018825+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1', '138.64.248.55', NULL, NULL, NULL, NULL, NULL),
	('92d73999-0d31-43d4-8ffc-235b1441c8a8', 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-07-01 06:05:29.851309+00', '2026-07-01 06:05:29.851309+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '126.219.233.5', NULL, NULL, NULL, NULL, NULL),
	('8d454739-7190-45c7-a9f9-33dac7caead1', 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-07-01 05:59:32.543011+00', '2026-07-01 07:23:33.421828+00', NULL, 'aal1', NULL, '2026-07-01 07:23:33.421727', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '126.219.233.5', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('35d19cdb-c899-4c08-80ae-8efb76496581', '2026-04-17 02:26:32.710874+00', '2026-04-17 02:26:32.710874+00', 'password', 'f1f4ae8e-320d-4f7c-ada5-ab3c110265a0'),
	('9e50b33f-c06e-41cb-a483-c8cf9b618919', '2026-04-19 23:49:26.060598+00', '2026-04-19 23:49:26.060598+00', 'password', 'd1e1d0ac-995d-4665-8807-03fd41d8d6e0'),
	('e77b2efe-88b8-4caa-a71a-44660e05489d', '2026-04-19 23:53:07.083929+00', '2026-04-19 23:53:07.083929+00', 'password', 'c1069580-00eb-427d-8bf3-c4074eb16123'),
	('8d454739-7190-45c7-a9f9-33dac7caead1', '2026-07-01 05:59:32.578961+00', '2026-07-01 05:59:32.578961+00', 'password', '55042f26-8953-42e7-8fba-3fb10d1cb5ad'),
	('92d73999-0d31-43d4-8ffc-235b1441c8a8', '2026-07-01 06:05:29.93023+00', '2026-07-01 06:05:29.93023+00', 'password', 'e953256a-5fa9-470c-a1d7-f4e0b343c9e9');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 100, 'mhj6ppwun4mf', 'a485b432-0dda-4013-b99a-8078418ece9d', false, '2026-04-17 02:26:32.689696+00', '2026-04-17 02:26:32.689696+00', NULL, '35d19cdb-c899-4c08-80ae-8efb76496581'),
	('00000000-0000-0000-0000-000000000000', 102, 'qfly3qglej5v', 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', false, '2026-04-19 23:49:26.041345+00', '2026-04-19 23:49:26.041345+00', NULL, '9e50b33f-c06e-41cb-a483-c8cf9b618919'),
	('00000000-0000-0000-0000-000000000000', 103, '547tyjzqt5ll', 'a485b432-0dda-4013-b99a-8078418ece9d', true, '2026-04-19 23:53:07.064605+00', '2026-05-21 03:54:38.541028+00', NULL, 'e77b2efe-88b8-4caa-a71a-44660e05489d'),
	('00000000-0000-0000-0000-000000000000', 117, 'lf7z6oetfqj2', 'a485b432-0dda-4013-b99a-8078418ece9d', false, '2026-05-21 03:54:38.564091+00', '2026-05-21 03:54:38.564091+00', '547tyjzqt5ll', 'e77b2efe-88b8-4caa-a71a-44660e05489d'),
	('00000000-0000-0000-0000-000000000000', 123, 'ibiyowxcde5a', 'ece67739-c917-4f35-b15b-fd9c65cdb019', false, '2026-07-01 06:05:29.892633+00', '2026-07-01 06:05:29.892633+00', NULL, '92d73999-0d31-43d4-8ffc-235b1441c8a8'),
	('00000000-0000-0000-0000-000000000000', 122, 'of5fyp6dj3xy', 'ece67739-c917-4f35-b15b-fd9c65cdb019', true, '2026-07-01 05:59:32.56611+00', '2026-07-01 07:23:33.376196+00', NULL, '8d454739-7190-45c7-a9f9-33dac7caead1'),
	('00000000-0000-0000-0000-000000000000', 124, 'hbeecknhapt2', 'ece67739-c917-4f35-b15b-fd9c65cdb019', false, '2026-07-01 07:23:33.400451+00', '2026-07-01 07:23:33.400451+00', 'of5fyp6dj3xy', '8d454739-7190-45c7-a9f9-33dac7caead1');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: app_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_users" ("user_id", "is_master", "created_at", "display_name", "sort_order", "is_subcontractor") VALUES
	('f3fe2f70-a103-4d6b-9aa2-4415d9d88bc9', false, '2026-03-31 06:36:40.839325+00', '作業員B', 2, false),
	('ece67739-c917-4f35-b15b-fd9c65cdb019', false, '2026-03-31 06:55:48.428829+00', '作業員A', 1, false),
	('a485b432-0dda-4013-b99a-8078418ece9d', false, '2026-04-16 08:22:56.801584+00', '協力会社', 0, true),
	('ab63bf10-3cf3-4164-8aef-5429fc776eb6', true, '2026-03-31 06:17:31.095335+00', 'アドミニスター', 0, false);


--
-- Data for Name: sites; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."sites" ("id", "name", "address", "is_active", "created_at", "updated_at") VALUES
	('ae5af688-458c-4dd0-976e-3fb7b8f69261', '長い名前の現場名長い名前の現場名長い名前の現場名長い名前の現場名', NULL, true, '2026-03-31 08:41:59.366619+00', '2026-04-03 08:24:01.93297+00'),
	('18d05c2c-a0ea-4b8c-8aa7-cdad3d4820da', '○○ビル解体', NULL, true, '2026-03-30 06:54:55.752263+00', '2026-04-07 02:19:42.834202+00'),
	('13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '梅田駅前ビル', '大阪府大阪市北区梅田１丁目１−３', true, '2026-03-30 06:44:46.340071+00', '2026-04-07 02:19:44.627554+00');


--
-- Data for Name: work_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."work_categories" ("id", "name", "sort_order", "is_active", "created_at", "updated_at") VALUES
	('56360a63-a882-4923-b101-b71ae11a7046', '内装解体', 0, true, '2026-04-13 06:59:50.439519+00', '2026-04-13 06:59:50.439519+00'),
	('85ba70bd-66a8-4b04-b86d-0265c0aac502', '木造建築解体', 1, true, '2026-04-13 07:00:11.005391+00', '2026-04-13 07:00:11.005391+00'),
	('612229fa-0500-4205-b95b-a270fbb5718f', '鉄骨建物解体', 2, true, '2026-04-13 07:00:20.627924+00', '2026-04-13 07:00:20.627924+00'),
	('d35a33b6-1e18-4abd-9552-50805655ec77', 'RC解体', 3, true, '2026-04-13 07:00:29.854202+00', '2026-04-13 07:00:29.854202+00'),
	('b2349e37-1fc2-4076-88e8-a5745f5a29cf', 'アスベスト除去', 4, true, '2026-04-13 07:00:37.103381+00', '2026-04-13 07:00:37.103381+00'),
	('df43cd28-feae-48a9-ba2b-f9ac3be8b897', '内装工事一式', 5, true, '2026-04-13 07:00:44.41466+00', '2026-04-13 07:00:44.41466+00'),
	('1718ff5b-0e57-401c-8a55-f0fc7f0757d1', '産業廃棄物収集運搬', 6, true, '2026-04-13 07:00:51.325571+00', '2026-04-13 07:00:51.325571+00'),
	('f7c3c576-d55f-4778-bf3f-f16f71d2b222', '土木工事', 7, true, '2026-04-13 07:01:03.524265+00', '2026-04-13 07:01:03.524265+00'),
	('85934d88-81a6-4683-81b0-1240554db97d', '現状復旧工事', 8, true, '2026-04-13 07:01:26.519802+00', '2026-04-13 07:02:02.118556+00');


--
-- Data for Name: daily_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."daily_reports" ("id", "site_id", "report_date", "worker_count", "tomorrow_plan", "note", "created_by", "created_at", "updated_at", "work_shift", "contract_type", "miscellaneous_costs", "lease_nishicon", "lease_joto", "lease_aktio", "waste_eishin", "waste_rsk", "waste_asahi", "waste_gara", "waste_shiba", "vehicle_2tc_count", "vehicle_2tl_gate_count", "vehicle_4tc_count", "vehicle_2td_count", "vehicle_passenger_count", "vehicle_aktio_2tl_count", "vehicle_aktio_2td_count", "other_vehicle_count", "other_vehicle_note", "other_workers_note", "remarks", "progress_status", "other_vehicle_entries", "work_category_id", "work_description", "reporter_name", "site_name") VALUES
	('8033c77a-19e1-43d2-a676-0367eedf8f4b', '13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '2026-03-30', 1, 'テスト日報', 'テスト〜', 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-03-30 07:36:29.953458+00', '2026-03-30 07:36:29.953458+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, '[]', NULL, NULL, NULL, NULL),
	('195d53c0-485e-4e6a-bbb7-3a65e1c938d7', '13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '2026-02-12', 1, 'テスト', 'テスト', 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-03-30 07:37:20.154346+00', '2026-03-30 07:54:18.375384+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, '[]', NULL, NULL, NULL, NULL),
	('8d8deae3-dc54-4928-9bde-0ec3106ea386', '13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '2026-02-12', 2, 'テストー', 'テスト〜', 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-03-30 07:58:38.505674+00', '2026-03-30 07:58:38.505674+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, '[]', NULL, NULL, NULL, NULL),
	('10473d94-f9ac-454d-b634-5f9df06b06db', '18d05c2c-a0ea-4b8c-8aa7-cdad3d4820da', '2026-03-12', 2, 'テスト〜', NULL, 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-03-30 08:13:43.884138+00', '2026-03-30 08:13:43.884138+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, '[]', NULL, NULL, NULL, NULL),
	('8bbd34ec-ce72-4b9e-9eea-aff26771a09f', '13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '2026-02-20', 1, 'てすてすと', NULL, 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-03-30 07:59:07.102114+00', '2026-03-31 08:41:12.690701+00', 'day', 'contract', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 'テキストが入りますテキストが入りますテキストが入りますテキストが入りますテキストが入ります', 'continuing', '[]', NULL, NULL, NULL, NULL),
	('1b50ca85-6db7-4891-8ec1-beab27b684dc', '18d05c2c-a0ea-4b8c-8aa7-cdad3d4820da', '2026-03-31', 4, NULL, NULL, 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-03-31 03:56:23.044322+00', '2026-03-31 09:18:11.517548+00', 'night', 'regular', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'completed', '[]', NULL, NULL, NULL, NULL),
	('46fdab85-ebe4-41d1-b50d-6c91428266d6', 'ae5af688-458c-4dd0-976e-3fb7b8f69261', '2026-04-03', 3, NULL, NULL, 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-04-03 07:53:54.496429+00', '2026-04-03 08:00:28.872832+00', 'night', 'regular', 'test', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 'Test report', 'completed', '[]', NULL, NULL, NULL, NULL),
	('c036a508-7eef-41ab-b7d7-18a3fcac0e12', '13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '2026-04-06', 1, NULL, NULL, 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-04-06 01:21:44.738888+00', '2026-04-06 01:21:44.738888+00', 'day', 'contract', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'continuing', '[]', NULL, NULL, NULL, NULL),
	('e270c51f-c233-4b31-8647-9d27dd446202', '13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '2026-04-02', 2, NULL, NULL, 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-04-06 01:53:55.832755+00', '2026-04-06 01:54:11.120547+00', 'day', 'regular', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'completed', '[]', NULL, NULL, NULL, NULL),
	('136215a6-2869-4c51-ad88-7f47933c41db', '18d05c2c-a0ea-4b8c-8aa7-cdad3d4820da', '2026-04-08', 1, NULL, NULL, 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-04-08 20:45:15.423009+00', '2026-04-08 20:45:15.423009+00', 'day', 'contract', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'completed', '[]', NULL, NULL, NULL, NULL),
	('ae629c29-1223-4140-ac68-1fef445460b9', '13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '2026-04-13', 1, NULL, NULL, 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', '2026-04-13 05:42:24.579327+00', '2026-04-13 05:42:24.579327+00', 'night', 'contract', 'テスト', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'continuing', '[]', NULL, NULL, NULL, NULL),
	('9f1f0a9c-f8ea-4661-b8ae-e22272e19494', '13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '2026-04-13', 1, NULL, NULL, 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-04-13 06:27:47.838945+00', '2026-04-13 06:27:47.838945+00', 'day', 'contract', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'continuing', '[]', NULL, NULL, NULL, NULL),
	('9190906e-aae7-46f5-9192-c49f430e4cfc', '13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '2026-04-13', 6, NULL, NULL, 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', '2026-04-13 07:11:10.653549+00', '2026-04-13 07:56:36.245004+00', 'day', 'contract', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 'テスト', 'continuing', '[]', '85ba70bd-66a8-4b04-b86d-0265c0aac502', NULL, NULL, NULL),
	('89d21822-6b2f-4e6f-9104-d7b90b3af9b7', '13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '2026-04-13', 1, NULL, NULL, 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-04-13 06:27:22.258351+00', '2026-04-13 07:57:00.968631+00', 'day', 'contract', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'continuing', '[]', '1718ff5b-0e57-401c-8a55-f0fc7f0757d1', NULL, NULL, NULL),
	('9e061ec5-5cda-436b-b7f5-fcecb41b0a61', 'ae5af688-458c-4dd0-976e-3fb7b8f69261', '2026-04-16', 6, NULL, NULL, 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', '2026-04-16 06:13:28.472083+00', '2026-04-16 07:32:05.038212+00', 'night', 'contract', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'continuing', '[]', '612229fa-0500-4205-b95b-a270fbb5718f', NULL, NULL, NULL),
	('62d8c028-37d8-432a-8637-831f9558cd8b', '18d05c2c-a0ea-4b8c-8aa7-cdad3d4820da', '2026-04-16', 2, NULL, NULL, 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', '2026-04-16 07:40:40.897356+00', '2026-04-16 07:40:40.897356+00', 'day', 'contract', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'continuing', '[]', '85ba70bd-66a8-4b04-b86d-0265c0aac502', NULL, NULL, NULL),
	('22eeee89-e67a-40ba-95e6-9b7789287f91', '18d05c2c-a0ea-4b8c-8aa7-cdad3d4820da', '2026-04-16', 1, NULL, NULL, 'a485b432-0dda-4013-b99a-8078418ece9d', '2026-04-16 14:11:22.505365+00', '2026-04-16 14:11:22.505365+00', 'day', 'contract', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'completed', '[]', '85ba70bd-66a8-4b04-b86d-0265c0aac502', NULL, 'まるまる社　まるまる太郎', NULL),
	('c2309dc1-4bed-4a4c-9143-a2ed39ee398e', '18d05c2c-a0ea-4b8c-8aa7-cdad3d4820da', '2026-04-17', 27, NULL, NULL, 'f3fe2f70-a103-4d6b-9aa2-4415d9d88bc9', '2026-04-17 00:33:52.499271+00', '2026-04-17 00:33:52.499271+00', 'day', 'contract', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'completed', '[]', 'b2349e37-1fc2-4076-88e8-a5745f5a29cf', NULL, '作業員B', NULL),
	('5fded062-9c13-4414-95be-da2ed49c626d', '18d05c2c-a0ea-4b8c-8aa7-cdad3d4820da', '2026-04-20', 8, NULL, NULL, 'a485b432-0dda-4013-b99a-8078418ece9d', '2026-04-20 00:13:50.886681+00', '2026-04-20 00:13:50.886681+00', 'night', 'regular', '3TL×1台　2750中型料金
ゲンタン3本、FK2本　養生テープ1箱
セイバーソー刃10枚
丸ノコ刃2枚
', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, '徳永商店作業員3名
満窪興業作業員4名', '明日は廃材搬出はありません
明日の作業員人数は8名予定', 'continuing', '[]', '56360a63-a882-4923-b101-b71ae11a7046', '内装解体、解体材の搬出', '(株)大吾興業　渡', NULL),
	('feabf381-b541-4453-b255-6563f9a195db', '13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '2026-04-23', 1, NULL, NULL, 'f3fe2f70-a103-4d6b-9aa2-4415d9d88bc9', '2026-04-23 13:55:46.345181+00', '2026-04-23 13:55:46.345181+00', 'day', 'contract', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'continuing', '[]', 'f7c3c576-d55f-4778-bf3f-f16f71d2b222', NULL, '作業員B', NULL),
	('16f4df09-310e-44b5-ad42-e73fa8f8569e', '18d05c2c-a0ea-4b8c-8aa7-cdad3d4820da', '2026-05-12', 1, NULL, NULL, 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-05-12 12:58:37.822768+00', '2026-05-12 12:58:37.822768+00', 'night', 'regular', 'Test', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'continuing', '[]', 'f7c3c576-d55f-4778-bf3f-f16f71d2b222', NULL, '作業員A', NULL),
	('7642c8aa-80db-4628-9084-184c887b0ef8', '13f071ae-0fd4-4264-89cd-308bd3b0e1a7', '2026-05-18', 1, NULL, NULL, 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-05-18 00:19:57.219707+00', '2026-05-18 00:19:57.219707+00', 'night', 'contract', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, 'continuing', '[]', 'd35a33b6-1e18-4abd-9552-50805655ec77', NULL, '作業員A', NULL);


--
-- Data for Name: disposal_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."disposal_items" ("id", "name", "sort_order", "is_active", "created_at", "updated_at") VALUES
	('916dd851-b4cc-43c8-8d06-9ff0f337e5d0', 'テスト', 5, false, '2026-03-31 07:47:27.244127+00', '2026-03-31 07:55:16.66495+00'),
	('115e6e94-df5b-4dd4-adf5-c64dad70d6a8', 'ガラ', 3, false, '2026-03-31 07:46:38.834988+00', '2026-04-13 08:27:43.426079+00'),
	('2de01c77-7aca-4b56-bcb3-aff267dafaf8', 'シバ', 4, false, '2026-03-31 07:46:45.423152+00', '2026-04-13 08:27:48.79381+00'),
	('f91951f0-0a34-43e6-9ace-aa9711d5c3bb', 'RSK', 2, false, '2026-03-31 07:44:44.711226+00', '2026-04-16 08:16:35.58367+00'),
	('1a6f9bff-76d4-42a6-9154-652eafe0aac3', '旭美興産', 1, false, '2026-03-31 07:44:38.358288+00', '2026-04-16 08:16:39.650358+00'),
	('9e34b49a-44f4-4a77-beda-c758c884a8f7', 'その他', 6, true, '2026-04-16 08:29:45.787904+00', '2026-04-16 08:29:45.787904+00'),
	('6ea3efb6-c111-4fd1-9ea5-7dae8191106b', 'エイシン', 0, true, '2026-03-31 07:42:28.460195+00', '2026-04-16 08:29:46.974893+00'),
	('5d2ebbeb-0bc8-41fe-b374-a88bb264c017', '都市クリエイト　高槻', 1, true, '2026-04-16 08:16:02.937186+00', '2026-04-16 08:29:46.974893+00'),
	('a536bd6f-0a02-426a-895c-a5b1e6799098', '都市クリエイト　湾岸', 2, true, '2026-04-16 08:16:12.959422+00', '2026-04-16 08:29:46.974893+00'),
	('01a9f354-b3aa-4643-aac6-21bec82d9af5', '南野商店', 3, true, '2026-04-16 08:16:18.834064+00', '2026-04-16 08:29:46.974893+00'),
	('c2ff9166-17e7-4cfa-b4f8-df8fabfb7ed9', '阪南産業', 4, true, '2026-04-16 08:16:24.78164+00', '2026-04-16 08:29:46.974893+00'),
	('e5ea665c-be4f-4944-b626-d40573d8de82', '環境保全センター', 5, true, '2026-04-16 08:16:30.722218+00', '2026-04-16 08:29:46.974893+00'),
	('6662063b-9c05-4e09-b119-40072fbaad46', 'その他', 6, false, '2026-04-16 08:29:43.729524+00', '2026-04-16 08:30:32.190548+00');


--
-- Data for Name: daily_report_disposal_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."daily_report_disposal_items" ("id", "report_id", "disposal_item_id", "ton_count", "truck_count", "created_at", "waste_type", "other_label") VALUES
	('ed9f9b54-c2b2-4e43-be11-0acf1bbf06bf', '46fdab85-ebe4-41d1-b50d-6c91428266d6', '6ea3efb6-c111-4fd1-9ea5-7dae8191106b', 3, 1, '2026-04-03 08:00:29.507177+00', 'wood', NULL),
	('2caff497-0f3d-4375-8aa0-43e4038e1602', '46fdab85-ebe4-41d1-b50d-6c91428266d6', 'f91951f0-0a34-43e6-9ace-aa9711d5c3bb', 1, 3, '2026-04-03 08:00:29.507177+00', 'wood', NULL),
	('145fd836-cba7-42c7-8469-19b4dd221d43', '46fdab85-ebe4-41d1-b50d-6c91428266d6', 'f91951f0-0a34-43e6-9ace-aa9711d5c3bb', 3, 1, '2026-04-03 08:00:29.507177+00', 'wood', NULL),
	('077b74ce-f59c-4a79-8cb1-21996661fa71', '46fdab85-ebe4-41d1-b50d-6c91428266d6', '115e6e94-df5b-4dd4-adf5-c64dad70d6a8', 5, 0, '2026-04-03 08:00:29.507177+00', 'wood', NULL),
	('bfd96d27-823b-460a-9110-da36f904e860', '46fdab85-ebe4-41d1-b50d-6c91428266d6', '2de01c77-7aca-4b56-bcb3-aff267dafaf8', 0, 10, '2026-04-03 08:00:29.507177+00', 'wood', NULL),
	('c77663a8-28b4-41a8-8aad-3c65d55808ae', '136215a6-2869-4c51-ad88-7f47933c41db', '6ea3efb6-c111-4fd1-9ea5-7dae8191106b', 2, 1, '2026-04-08 20:45:15.423009+00', 'wood', NULL),
	('8a25663d-2edb-48f1-86e0-1a995267aafb', '136215a6-2869-4c51-ad88-7f47933c41db', '6ea3efb6-c111-4fd1-9ea5-7dae8191106b', 1, 1, '2026-04-08 20:45:15.423009+00', 'wood', NULL),
	('fdfd750a-6f7e-4cb7-a276-a6aae13ee543', '89d21822-6b2f-4e6f-9104-d7b90b3af9b7', '1a6f9bff-76d4-42a6-9154-652eafe0aac3', 3, 0, '2026-04-13 07:57:00.968631+00', 'wood', NULL),
	('991a1722-4c4b-48f1-9d36-2b00b375d12a', '89d21822-6b2f-4e6f-9104-d7b90b3af9b7', '6ea3efb6-c111-4fd1-9ea5-7dae8191106b', 3, 1, '2026-04-13 07:57:00.968631+00', 'wood', NULL),
	('55763320-0df9-4ee9-8e3e-15d77c9a8370', 'c2309dc1-4bed-4a4c-9143-a2ed39ee398e', 'e5ea665c-be4f-4944-b626-d40573d8de82', 2, 4, '2026-04-17 00:33:52.499271+00', 'asbestos', NULL),
	('5b8b2014-4cd4-4d9a-afc8-a85760bac70c', '5fded062-9c13-4414-95be-da2ed49c626d', 'a536bd6f-0a02-426a-895c-a5b1e6799098', 3, 1, '2026-04-20 00:13:50.886681+00', 'board', NULL),
	('c62a4e91-3eb4-4de4-8152-22da0bcb8db7', '5fded062-9c13-4414-95be-da2ed49c626d', 'a536bd6f-0a02-426a-895c-a5b1e6799098', 4, 2, '2026-04-20 00:13:50.886681+00', 'mixed', NULL),
	('c152db6a-69a0-45e5-af0c-4d88ab008e05', '5fded062-9c13-4414-95be-da2ed49c626d', 'c2ff9166-17e7-4cfa-b4f8-df8fabfb7ed9', 2, 1, '2026-04-20 00:13:50.886681+00', 'wood', NULL),
	('8a8f7d89-69c1-43c0-b08a-2ca0fcb36c09', '5fded062-9c13-4414-95be-da2ed49c626d', '01a9f354-b3aa-4643-aac6-21bec82d9af5', 4, 1, '2026-04-20 00:13:50.886681+00', 'mixed', NULL),
	('2c12ccf9-edde-4a5f-a950-afb156a3799c', '5fded062-9c13-4414-95be-da2ed49c626d', 'e5ea665c-be4f-4944-b626-d40573d8de82', 3, 1, '2026-04-20 00:13:50.886681+00', 'asbestos', NULL);


--
-- Data for Name: worker_labels; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."worker_labels" ("id", "name", "unit_price", "sort_order", "is_active", "created_at", "updated_at") VALUES
	('9401defb-f54b-48ce-a3f9-95c764581759', '大吾興業', 0, 0, true, '2026-04-13 06:53:58.287292+00', '2026-04-16 13:41:43.93289+00'),
	('200e5a38-6f88-4c66-9b4f-99b42fb1f4e6', '大吾興業：シニア', 15000, 1, true, '2026-04-16 13:41:40.754297+00', '2026-04-16 13:41:43.93289+00'),
	('ca9f9039-df43-477f-b09e-c4986cdd6031', '大吾興業：実習生', 7000, 2, true, '2026-04-16 07:38:50.987258+00', '2026-04-16 13:41:43.93289+00'),
	('31a22d0c-bc6d-428d-85e8-537ce427458f', 'ユーアイ', 10000, 3, true, '2026-04-13 06:54:14.252676+00', '2026-04-16 13:41:43.93289+00'),
	('565bf17c-bade-4449-8af8-561ee6ddade2', '○○社', 15000, 4, true, '2026-04-13 06:54:37.673184+00', '2026-04-16 13:41:43.93289+00'),
	('773e490b-0e7a-46cf-97f1-af21fe4b201a', '○○社：土木作業員', 17000, 5, true, '2026-04-13 06:55:03.237087+00', '2026-04-16 13:41:43.93289+00'),
	('f43da99b-76d3-4396-a838-607ce799002c', '××社', 12000, 6, true, '2026-04-13 06:55:30.351543+00', '2026-04-16 13:41:43.93289+00');


--
-- Data for Name: daily_report_external_workers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."daily_report_external_workers" ("id", "report_id", "worker_label_id", "label_snapshot", "count", "unit_price_snapshot", "created_at") VALUES
	('0b696730-55a7-48b9-afef-477ab7e460b3', '22eeee89-e67a-40ba-95e6-9b7789287f91', '773e490b-0e7a-46cf-97f1-af21fe4b201a', '○○社：土木作業員', 1, 17000, '2026-04-16 14:11:22.505365+00'),
	('94adb75e-4e55-4887-9c5d-55e8d360790f', 'c2309dc1-4bed-4a4c-9143-a2ed39ee398e', '31a22d0c-bc6d-428d-85e8-537ce427458f', 'ユーアイ', 15, 10000, '2026-04-17 00:33:52.499271+00'),
	('3fc44160-cfc2-47eb-9626-b0032b3c2768', 'c2309dc1-4bed-4a4c-9143-a2ed39ee398e', 'f43da99b-76d3-4396-a838-607ce799002c', '××社', 11, 12000, '2026-04-17 00:33:52.499271+00'),
	('43533a88-c74c-4758-8619-3e7eeae2f6ed', '5fded062-9c13-4414-95be-da2ed49c626d', '565bf17c-bade-4449-8af8-561ee6ddade2', '○○社', 4, 15000, '2026-04-20 00:13:50.886681+00');


--
-- Data for Name: lease_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."lease_items" ("id", "name", "sort_order", "is_active", "created_at", "updated_at") VALUES
	('d0273622-aa26-45d2-8aa7-bb6ef53ec434', 'ニシコン', 0, true, '2026-03-31 07:40:48.992945+00', '2026-03-31 07:40:48.992945+00'),
	('b828a42c-bd59-4a89-9806-bb4d719c5c32', '城東リース', 1, true, '2026-03-31 07:41:24.924128+00', '2026-03-31 07:41:24.924128+00'),
	('80eea5fc-a7f5-43c1-9431-023e5e61cf04', 'アクティオ', 2, true, '2026-03-31 07:41:31.26517+00', '2026-03-31 07:41:31.26517+00');


--
-- Data for Name: daily_report_lease_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."daily_report_lease_items" ("id", "report_id", "lease_item_id", "count", "created_at", "item_name") VALUES
	('80247ca6-85cf-40ae-ae60-15905df34c70', '46fdab85-ebe4-41d1-b50d-6c91428266d6', 'd0273622-aa26-45d2-8aa7-bb6ef53ec434', 2, '2026-04-03 08:00:29.508818+00', NULL),
	('20883d28-1065-4e71-8cf8-5677e3042401', '46fdab85-ebe4-41d1-b50d-6c91428266d6', 'b828a42c-bd59-4a89-9806-bb4d719c5c32', 2, '2026-04-03 08:00:29.508818+00', NULL),
	('fb1e65bf-b668-4204-a907-525d06b3503f', 'e270c51f-c233-4b31-8647-9d27dd446202', 'd0273622-aa26-45d2-8aa7-bb6ef53ec434', 3, '2026-04-06 01:54:11.120547+00', NULL),
	('44f2ae96-56a0-4f54-96a0-4b4cadffb6cf', '136215a6-2869-4c51-ad88-7f47933c41db', 'd0273622-aa26-45d2-8aa7-bb6ef53ec434', 2, '2026-04-08 20:45:15.423009+00', NULL),
	('7477ca92-926d-4933-9965-4b066ebcabb1', '89d21822-6b2f-4e6f-9104-d7b90b3af9b7', '80eea5fc-a7f5-43c1-9431-023e5e61cf04', 10, '2026-04-13 07:57:00.968631+00', 'アクティオ'),
	('48638451-8382-4934-ae2a-eb7b748c22f1', '22eeee89-e67a-40ba-95e6-9b7789287f91', 'd0273622-aa26-45d2-8aa7-bb6ef53ec434', 4, '2026-04-16 14:11:22.505365+00', 'ひゃー'),
	('ee26078f-aa00-4c19-80ad-076f5c9099b5', '5fded062-9c13-4414-95be-da2ed49c626d', '80eea5fc-a7f5-43c1-9431-023e5e61cf04', 2, '2026-04-20 00:13:50.886681+00', '集塵機'),
	('62f0a64d-927f-4a4f-91f6-202bfc01dd11', '5fded062-9c13-4414-95be-da2ed49c626d', '80eea5fc-a7f5-43c1-9431-023e5e61cf04', 1, '2026-04-20 00:13:50.886681+00', 'ペッカー'),
	('a81c8bbb-5565-4e05-98e1-1592baae10f8', '5fded062-9c13-4414-95be-da2ed49c626d', 'd0273622-aa26-45d2-8aa7-bb6ef53ec434', 1, '2026-04-20 00:13:50.886681+00', '重機0.25'),
	('650c9eff-5a59-46cc-85ab-160503b84a38', '5fded062-9c13-4414-95be-da2ed49c626d', 'd0273622-aa26-45d2-8aa7-bb6ef53ec434', 1, '2026-04-20 00:13:50.886681+00', 'ハンドクラッシャー200V');


--
-- Data for Name: machines; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: daily_report_machines; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: partner_companies; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: daily_report_partner_companies; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: safety_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."safety_items" ("id", "name", "sort_order", "is_active", "created_at", "updated_at") VALUES
	('dcf6d1ea-3124-47b5-bf41-b9b1d1ff2e07', '名前', 0, true, '2026-03-30 06:43:54.304003+00', '2026-03-30 06:43:54.304003+00');


--
-- Data for Name: daily_report_safety_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."daily_report_safety_items" ("id", "report_id", "safety_item_id", "created_at") VALUES
	('4018baef-0454-419d-93ce-9a45ae2d0a4f', '8033c77a-19e1-43d2-a676-0367eedf8f4b', 'dcf6d1ea-3124-47b5-bf41-b9b1d1ff2e07', '2026-03-30 07:36:30.256343+00'),
	('073e2d10-d0d8-45bd-86d8-a8748732fd2d', '195d53c0-485e-4e6a-bbb7-3a65e1c938d7', 'dcf6d1ea-3124-47b5-bf41-b9b1d1ff2e07', '2026-03-30 07:54:18.536043+00'),
	('43dafe5c-b6e0-4fb8-a871-f8eab359b8b3', '8d8deae3-dc54-4928-9bde-0ec3106ea386', 'dcf6d1ea-3124-47b5-bf41-b9b1d1ff2e07', '2026-03-30 07:58:38.652622+00'),
	('047f0006-1f9a-4436-a7b5-9f9ee2bc30bb', '8bbd34ec-ce72-4b9e-9eea-aff26771a09f', 'dcf6d1ea-3124-47b5-bf41-b9b1d1ff2e07', '2026-03-30 07:59:07.303877+00'),
	('c60d75b1-e38f-4ffc-abd2-03ab2b1cc301', '10473d94-f9ac-454d-b634-5f9df06b06db', 'dcf6d1ea-3124-47b5-bf41-b9b1d1ff2e07', '2026-03-30 08:13:47.749761+00'),
	('22a3ab34-2be7-48bc-b6e3-f93b816ac9d1', '1b50ca85-6db7-4891-8ec1-beab27b684dc', 'dcf6d1ea-3124-47b5-bf41-b9b1d1ff2e07', '2026-03-31 03:56:24.45434+00');


--
-- Data for Name: transport_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."transport_items" ("id", "name", "sort_order", "is_active", "created_at", "updated_at") VALUES
	('524f05a5-f1c6-43fb-b55b-7e5b49e76c3e', '2TC', 0, true, '2026-03-31 08:00:52.24939+00', '2026-03-31 08:00:52.24939+00'),
	('f1ca9687-7fdf-4381-87f4-5c25bdc91574', '2TLゲート車', 1, true, '2026-03-31 08:01:28.31983+00', '2026-03-31 08:01:28.31983+00'),
	('b622ef88-611f-4aa7-8521-844a5baf529a', '4TC', 2, true, '2026-03-31 08:04:59.654107+00', '2026-03-31 08:04:59.654107+00'),
	('b736ce66-649f-4586-97a1-7492cda9ccc3', '2TD', 3, true, '2026-03-31 08:06:14.509356+00', '2026-03-31 08:06:14.509356+00'),
	('37310fc6-812e-4120-8b98-9e86eba4c838', '乗用車', 4, true, '2026-03-31 08:08:22.7126+00', '2026-03-31 08:08:22.7126+00'),
	('f1c05b89-2067-4d1e-9f38-3e0f55f64f93', 'アクティオ2TL', 5, true, '2026-03-31 08:12:29.135983+00', '2026-03-31 08:12:29.135983+00'),
	('f7c88c39-36f9-44cb-860e-5ced532b1bb2', 'アクティオ2TD', 6, true, '2026-03-31 08:14:05.967454+00', '2026-03-31 08:14:05.967454+00'),
	('4a8de299-512a-4844-a8b1-7949609cb857', 'テスト', 7, false, '2026-03-31 08:14:14.664698+00', '2026-03-31 08:14:35.85511+00'),
	('2196df70-210f-40f6-a58e-eb44571bbe18', 'てテスト', 8, false, '2026-03-31 08:14:25.027094+00', '2026-03-31 08:14:39.796707+00'),
	('ab14a099-c120-4ec8-805a-b9503fdb7970', 'ててテスト', 9, false, '2026-03-31 08:14:30.826893+00', '2026-03-31 08:14:44.177622+00');


--
-- Data for Name: daily_report_transport_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."daily_report_transport_items" ("id", "report_id", "transport_item_id", "count", "created_at") VALUES
	('02c4eda9-b646-423a-89bc-00a5f6a092ae', '46fdab85-ebe4-41d1-b50d-6c91428266d6', '524f05a5-f1c6-43fb-b55b-7e5b49e76c3e', 1, '2026-04-03 08:00:29.489776+00'),
	('03e7a52a-8a43-4720-ba5d-21548a4f20ec', '46fdab85-ebe4-41d1-b50d-6c91428266d6', 'f1ca9687-7fdf-4381-87f4-5c25bdc91574', 10, '2026-04-03 08:00:29.489776+00'),
	('29009e3e-0b44-4955-8af6-25b4e8139869', '46fdab85-ebe4-41d1-b50d-6c91428266d6', 'b622ef88-611f-4aa7-8521-844a5baf529a', 10, '2026-04-03 08:00:29.489776+00'),
	('37c939dd-4064-426f-8dbb-4491d1f90ee6', '5fded062-9c13-4414-95be-da2ed49c626d', 'b622ef88-611f-4aa7-8521-844a5baf529a', 2, '2026-04-20 00:13:50.886681+00'),
	('2375cc3d-8cdd-4650-9f24-b7b4faf4b7af', '5fded062-9c13-4414-95be-da2ed49c626d', 'f1ca9687-7fdf-4381-87f4-5c25bdc91574', 3, '2026-04-20 00:13:50.886681+00');


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: daily_report_vehicles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: waste_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: daily_report_waste_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: work_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: daily_report_work_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: workers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."workers" ("id", "name", "sort_order", "is_active", "created_at", "updated_at", "group_label") VALUES
	('6bbaf35d-8eda-46cf-9e04-ee03d379b06e', 'テスト３太郎', 0, true, '2026-04-13 07:11:42.648904+00', '2026-04-16 13:01:50.590141+00', '大吾興業'),
	('a5af78f6-c0a2-4dd1-ab8d-1c0cb56ea4c7', 'テスト太郎', 1, true, '2026-03-30 07:17:20.585372+00', '2026-04-16 13:01:50.590141+00', '大吾興業'),
	('b1500e9b-5eba-4942-9281-00f7d880f9a6', '実習生A', 2, true, '2026-04-16 07:39:07.651744+00', '2026-04-16 13:01:50.590141+00', '大吾興業：実習生'),
	('1b298e47-90b2-4a71-8e56-95f54fd56754', 'ユーアイ太郎', 3, false, '2026-04-03 08:18:57.133778+00', '2026-04-16 13:01:58.014795+00', 'ユーアイ'),
	('784d9f32-6261-4db9-a390-fc7a0adc5e28', 'テスト２太郎', 4, false, '2026-03-31 07:35:20.80399+00', '2026-04-16 13:02:04.281524+00', '○○社：土木作業員'),
	('931aea35-687d-411e-b36b-10c069821d01', '会社名:テスト太郎', 5, false, '2026-03-31 03:21:54.034277+00', '2026-04-16 13:02:08.705067+00', '○○社'),
	('29d255b6-0de2-4662-9462-fede6188def9', 'テストこたろう', 6, false, '2026-03-30 07:17:32.533075+00', '2026-04-16 13:02:15.233133+00', '××社'),
	('d2afa6d8-46a0-456a-aa82-cb6872419308', 'ユーアイ従業員', 3, true, '2026-04-16 13:32:19.786702+00', '2026-04-16 13:32:19.786702+00', 'ユーアイ'),
	('54ab5681-ab68-42e2-b7e4-798c72340fad', '○○社従業員', 4, true, '2026-04-16 13:32:42.46828+00', '2026-04-16 13:32:42.46828+00', '○○社'),
	('003f65ee-f717-48c5-9a3b-f8dfc165cc2b', '○○社土木従業員', 5, true, '2026-04-16 13:32:52.856765+00', '2026-04-16 13:32:52.856765+00', '○○社：土木作業員'),
	('c4195833-1601-49af-9464-d3abb295ec8e', '××社従業員', 6, true, '2026-04-16 13:33:08.367173+00', '2026-04-16 13:33:08.367173+00', '××社'),
	('64115845-1b5c-4031-a647-62e26cb1905f', 'シニア太郎', 7, true, '2026-04-16 13:41:59.109508+00', '2026-04-16 13:41:59.109508+00', '大吾興業：シニア');


--
-- Data for Name: daily_report_workers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."daily_report_workers" ("id", "report_id", "worker_id", "created_at", "label_snapshot", "unit_price_snapshot") VALUES
	('4c2bacad-27f1-401e-b9e1-9a47da04e5fc', '8033c77a-19e1-43d2-a676-0367eedf8f4b', '29d255b6-0de2-4662-9462-fede6188def9', '2026-03-30 07:36:30.254649+00', NULL, 0),
	('fe2d1309-61f1-4ab0-bb14-4e5e4340c353', '195d53c0-485e-4e6a-bbb7-3a65e1c938d7', '29d255b6-0de2-4662-9462-fede6188def9', '2026-03-30 07:54:18.538632+00', NULL, 0),
	('3c5b64b4-5cea-4c17-aa4d-de6a5dab8bf9', '8d8deae3-dc54-4928-9bde-0ec3106ea386', '29d255b6-0de2-4662-9462-fede6188def9', '2026-03-30 07:58:38.680561+00', NULL, 0),
	('6807f270-fa92-4e2d-b485-2fa7fa7257c5', '8d8deae3-dc54-4928-9bde-0ec3106ea386', 'a5af78f6-c0a2-4dd1-ab8d-1c0cb56ea4c7', '2026-03-30 07:58:38.680561+00', NULL, 0),
	('76901a11-9d76-4734-900a-e3f983865243', '10473d94-f9ac-454d-b634-5f9df06b06db', 'a5af78f6-c0a2-4dd1-ab8d-1c0cb56ea4c7', '2026-03-30 08:13:47.747744+00', NULL, 0),
	('2aa59cd0-f2c2-486f-9f4a-d4051d20557e', '10473d94-f9ac-454d-b634-5f9df06b06db', '29d255b6-0de2-4662-9462-fede6188def9', '2026-03-30 08:13:47.747744+00', NULL, 0),
	('43c98690-66ad-448c-84bc-8f3161d08c90', '8bbd34ec-ce72-4b9e-9eea-aff26771a09f', 'a5af78f6-c0a2-4dd1-ab8d-1c0cb56ea4c7', '2026-03-31 08:41:12.978745+00', NULL, 0),
	('50b209aa-8f5c-4986-821d-2b2ba1546783', '1b50ca85-6db7-4891-8ec1-beab27b684dc', '931aea35-687d-411e-b36b-10c069821d01', '2026-03-31 09:18:13.613727+00', NULL, 0),
	('873a7596-5959-4d17-ad2a-a77996a47aed', '1b50ca85-6db7-4891-8ec1-beab27b684dc', '29d255b6-0de2-4662-9462-fede6188def9', '2026-03-31 09:18:13.613727+00', NULL, 0),
	('1f3a67c0-fc3f-4d5e-bd55-17a2e597b637', '1b50ca85-6db7-4891-8ec1-beab27b684dc', 'a5af78f6-c0a2-4dd1-ab8d-1c0cb56ea4c7', '2026-03-31 09:18:13.613727+00', NULL, 0),
	('c5546435-6219-430d-8b65-41d3058217b1', '1b50ca85-6db7-4891-8ec1-beab27b684dc', '784d9f32-6261-4db9-a390-fc7a0adc5e28', '2026-03-31 09:18:13.613727+00', NULL, 0),
	('d4544f8a-bb3c-4849-a994-38ae1e283e08', '46fdab85-ebe4-41d1-b50d-6c91428266d6', 'a5af78f6-c0a2-4dd1-ab8d-1c0cb56ea4c7', '2026-04-03 08:00:29.509031+00', NULL, 0),
	('91625a68-dd8b-4f4c-9441-c9a7c231fecf', '46fdab85-ebe4-41d1-b50d-6c91428266d6', '931aea35-687d-411e-b36b-10c069821d01', '2026-04-03 08:00:29.509031+00', NULL, 0),
	('8ff089de-b82b-4317-a532-127da5b34580', '46fdab85-ebe4-41d1-b50d-6c91428266d6', '784d9f32-6261-4db9-a390-fc7a0adc5e28', '2026-04-03 08:00:29.509031+00', NULL, 0),
	('b8520320-052b-4784-bfa2-2138cb464064', 'c036a508-7eef-41ab-b7d7-18a3fcac0e12', '29d255b6-0de2-4662-9462-fede6188def9', '2026-04-06 01:21:44.738888+00', NULL, 0),
	('d0f34659-046e-403c-9a6e-ff5ecafb75fb', 'e270c51f-c233-4b31-8647-9d27dd446202', 'a5af78f6-c0a2-4dd1-ab8d-1c0cb56ea4c7', '2026-04-06 01:54:11.120547+00', NULL, 0),
	('69cd5f45-bf16-484e-9625-803c5e000398', 'e270c51f-c233-4b31-8647-9d27dd446202', '784d9f32-6261-4db9-a390-fc7a0adc5e28', '2026-04-06 01:54:11.120547+00', NULL, 0),
	('cc3a46e4-62ac-42a5-b876-35c483798d39', '136215a6-2869-4c51-ad88-7f47933c41db', '29d255b6-0de2-4662-9462-fede6188def9', '2026-04-08 20:45:15.423009+00', NULL, 0),
	('8beaef74-eb2a-403f-acce-daf937895b0e', 'ae629c29-1223-4140-ac68-1fef445460b9', '784d9f32-6261-4db9-a390-fc7a0adc5e28', '2026-04-13 05:42:24.579327+00', NULL, 0),
	('b5ed3955-caa0-4143-9497-ed801d6d49e7', '9f1f0a9c-f8ea-4661-b8ae-e22272e19494', '784d9f32-6261-4db9-a390-fc7a0adc5e28', '2026-04-13 06:27:47.838945+00', NULL, 0),
	('e1fbad46-7407-4fd3-b8f9-6b8ddf9e5bff', '9190906e-aae7-46f5-9192-c49f430e4cfc', '6bbaf35d-8eda-46cf-9e04-ee03d379b06e', '2026-04-13 07:56:36.245004+00', '大吾興業', 0),
	('e7fdf10c-53aa-42d7-a0f3-91f18c8c8207', '9190906e-aae7-46f5-9192-c49f430e4cfc', 'a5af78f6-c0a2-4dd1-ab8d-1c0cb56ea4c7', '2026-04-13 07:56:36.245004+00', '大吾興業', 0),
	('e2486cad-87b4-4574-bf0a-b99252622fb9', '9190906e-aae7-46f5-9192-c49f430e4cfc', '1b298e47-90b2-4a71-8e56-95f54fd56754', '2026-04-13 07:56:36.245004+00', 'ユーアイ', 10000),
	('c68f2f01-87a5-4889-82be-dd32eef82f44', '9190906e-aae7-46f5-9192-c49f430e4cfc', '931aea35-687d-411e-b36b-10c069821d01', '2026-04-13 07:56:36.245004+00', '○○社', 15000),
	('73046c2a-21cf-4117-b0ba-2cb0b109aae9', '9190906e-aae7-46f5-9192-c49f430e4cfc', '784d9f32-6261-4db9-a390-fc7a0adc5e28', '2026-04-13 07:56:36.245004+00', '○○社：土木作業員', 17000),
	('11c16d5b-cebf-46f7-92b8-ed11c50d60f1', '9190906e-aae7-46f5-9192-c49f430e4cfc', '29d255b6-0de2-4662-9462-fede6188def9', '2026-04-13 07:56:36.245004+00', '××社', 12000),
	('62e73ab3-77d3-4e17-b451-8eacbf00e80e', '89d21822-6b2f-4e6f-9104-d7b90b3af9b7', '29d255b6-0de2-4662-9462-fede6188def9', '2026-04-13 07:57:00.968631+00', '××社', 0),
	('c4673aab-6087-45d8-8514-af4e1230d139', '9e061ec5-5cda-436b-b7f5-fcecb41b0a61', '6bbaf35d-8eda-46cf-9e04-ee03d379b06e', '2026-04-16 07:32:05.038212+00', '大吾興業', 0),
	('2499631f-fe9c-4af2-9b48-97339486fd65', '9e061ec5-5cda-436b-b7f5-fcecb41b0a61', 'a5af78f6-c0a2-4dd1-ab8d-1c0cb56ea4c7', '2026-04-16 07:32:05.038212+00', '大吾興業', 0),
	('757f2056-a60d-442e-a6d0-7d614b376c35', '9e061ec5-5cda-436b-b7f5-fcecb41b0a61', '1b298e47-90b2-4a71-8e56-95f54fd56754', '2026-04-16 07:32:05.038212+00', 'ユーアイ', 10000),
	('4d6b51b9-21a8-4d1e-9480-7543895f005a', '9e061ec5-5cda-436b-b7f5-fcecb41b0a61', '931aea35-687d-411e-b36b-10c069821d01', '2026-04-16 07:32:05.038212+00', '○○社', 15000),
	('d0d15a5d-0c95-411f-9cff-7bb6c807474b', '9e061ec5-5cda-436b-b7f5-fcecb41b0a61', '784d9f32-6261-4db9-a390-fc7a0adc5e28', '2026-04-16 07:32:05.038212+00', '○○社：土木作業員', 17000),
	('361f29e6-30a7-4e61-8508-4ec57814b69e', '9e061ec5-5cda-436b-b7f5-fcecb41b0a61', '29d255b6-0de2-4662-9462-fede6188def9', '2026-04-16 07:32:05.038212+00', '××社', 12000),
	('9090f057-d820-47ee-bc15-d3cc53dca616', '62d8c028-37d8-432a-8637-831f9558cd8b', '6bbaf35d-8eda-46cf-9e04-ee03d379b06e', '2026-04-16 07:40:40.897356+00', '大吾興業', 0),
	('962c0ae0-eddc-4754-b272-fd6eb8ed5080', '62d8c028-37d8-432a-8637-831f9558cd8b', 'b1500e9b-5eba-4942-9281-00f7d880f9a6', '2026-04-16 07:40:40.897356+00', '大吾興業：実習生', 7000),
	('fd3fcd7a-6553-4a30-a4f6-61fe72f381bb', 'c2309dc1-4bed-4a4c-9143-a2ed39ee398e', 'b1500e9b-5eba-4942-9281-00f7d880f9a6', '2026-04-17 00:33:52.499271+00', '大吾興業：実習生', 7000),
	('9795ee11-71db-4a31-a636-d6ee10ce6574', '5fded062-9c13-4414-95be-da2ed49c626d', 'a5af78f6-c0a2-4dd1-ab8d-1c0cb56ea4c7', '2026-04-20 00:13:50.886681+00', '大吾興業', 0),
	('7394aed9-10d4-4df0-91bf-2249b4c63efd', '5fded062-9c13-4414-95be-da2ed49c626d', '6bbaf35d-8eda-46cf-9e04-ee03d379b06e', '2026-04-20 00:13:50.886681+00', '大吾興業', 0),
	('35128526-29bf-44bf-bb43-55c3fc665c0d', '5fded062-9c13-4414-95be-da2ed49c626d', '64115845-1b5c-4031-a647-62e26cb1905f', '2026-04-20 00:13:50.886681+00', '大吾興業：シニア', 15000),
	('07a3e705-0f1e-4222-96e3-0c9ccf10ea3f', '5fded062-9c13-4414-95be-da2ed49c626d', 'b1500e9b-5eba-4942-9281-00f7d880f9a6', '2026-04-20 00:13:50.886681+00', '大吾興業：実習生', 7000),
	('f6fefc4e-2e1e-4083-993c-e691cf33ed96', 'feabf381-b541-4453-b255-6563f9a195db', 'b1500e9b-5eba-4942-9281-00f7d880f9a6', '2026-04-23 13:55:46.345181+00', '大吾興業：実習生', 7000),
	('741bb2b9-c628-42c8-9103-1741c80d4ded', '16f4df09-310e-44b5-ad42-e73fa8f8569e', '6bbaf35d-8eda-46cf-9e04-ee03d379b06e', '2026-05-12 12:58:37.822768+00', '大吾興業', 0),
	('7d691974-7c93-4ec2-9df4-996db0a7dcd1', '7642c8aa-80db-4628-9084-184c887b0ef8', '6bbaf35d-8eda-46cf-9e04-ee03d379b06e', '2026-05-18 00:19:57.219707+00', '大吾興業', 0);


--
-- Data for Name: report_edit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."report_edit_logs" ("id", "report_id", "edited_by", "edited_at") VALUES
	('4dc669a0-1567-4162-940f-099eff404b66', '1b50ca85-6db7-4891-8ec1-beab27b684dc', 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-03-31 09:17:18.863099+00'),
	('f3b5f068-0f21-487d-aa2c-adedf18b5d4c', '1b50ca85-6db7-4891-8ec1-beab27b684dc', 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', '2026-03-31 09:18:13.937106+00'),
	('4698d03f-74ca-436d-a9c4-37aa6f21da2a', '46fdab85-ebe4-41d1-b50d-6c91428266d6', 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-04-03 08:00:29.765209+00'),
	('347e6ade-fe58-437f-89a2-ab62198c19c3', 'e270c51f-c233-4b31-8647-9d27dd446202', 'ece67739-c917-4f35-b15b-fd9c65cdb019', '2026-04-06 01:54:11.120547+00'),
	('72a58c6f-4539-457b-97dd-d1f22818de5a', '9190906e-aae7-46f5-9192-c49f430e4cfc', 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', '2026-04-13 07:12:09.739479+00'),
	('bfedc2ed-e502-42f7-980f-05320786a1de', '9190906e-aae7-46f5-9192-c49f430e4cfc', 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', '2026-04-13 07:56:36.245004+00'),
	('5d31e4bc-501a-4215-b2a2-549b236749f5', '89d21822-6b2f-4e6f-9104-d7b90b3af9b7', 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', '2026-04-13 07:57:00.968631+00'),
	('32e9c667-bf72-468c-9966-6570d452a078', '9e061ec5-5cda-436b-b7f5-fcecb41b0a61', 'ab63bf10-3cf3-4164-8aef-5429fc776eb6', '2026-04-16 07:32:05.038212+00');


--
-- Data for Name: report_photos; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('report-photos', 'report-photos', NULL, '2026-03-30 05:56:31.780435+00', '2026-03-30 05:56:31.780435+00', true, false, NULL, NULL, NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 124, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict Q0YCE3JJkqMLLYQtoKxOkGnm68Y9ajpi1yEdtg5tjTqpwwRNjKE6Admc9YHJFur

RESET ALL;
