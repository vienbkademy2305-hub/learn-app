CREATE SCHEMA "content";
--> statement-breakpoint
CREATE TABLE "content"."audio_assets" (
	"id" integer PRIMARY KEY NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" integer NOT NULL,
	"speed" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"duration_ms" integer,
	"engine" text,
	"voice" text,
	"is_synthetic" boolean NOT NULL,
	"license" text,
	"sha256" text NOT NULL,
	"source_id" text NOT NULL,
	"source_record_id" text NOT NULL,
	CONSTRAINT "audio_assets_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "audio_assets_owner_type_owner_id_speed_source_id_unique" UNIQUE("owner_type","owner_id","speed","source_id")
);
--> statement-breakpoint
CREATE TABLE "content"."character_readings" (
	"id" integer PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"pinyin_numbered" text NOT NULL,
	"pinyin_marked" text NOT NULL,
	"is_primary" boolean NOT NULL,
	"source_id" text NOT NULL,
	"source_record_id" text NOT NULL,
	CONSTRAINT "character_readings_character_id_pinyin_numbered_unique" UNIQUE("character_id","pinyin_numbered")
);
--> statement-breakpoint
CREATE TABLE "content"."character_sino_viet" (
	"id" integer PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"reading" text NOT NULL,
	"is_primary" boolean NOT NULL,
	"status" text NOT NULL,
	"source_id" text NOT NULL,
	"source_record_id" text NOT NULL,
	CONSTRAINT "character_sino_viet_character_id_reading_source_id_unique" UNIQUE("character_id","reading","source_id")
);
--> statement-breakpoint
CREATE TABLE "content"."characters" (
	"id" integer PRIMARY KEY NOT NULL,
	"hanzi" text NOT NULL,
	"traditional" text,
	"radical" text,
	"decomposition" text,
	"etymology" jsonb,
	"definition_en" text,
	CONSTRAINT "characters_hanzi_unique" UNIQUE("hanzi")
);
--> statement-breakpoint
CREATE TABLE "content"."entity_sources" (
	"id" integer PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"source_id" text NOT NULL,
	"source_record_id" text NOT NULL,
	"source_version_id" integer,
	"role" text NOT NULL,
	CONSTRAINT "entity_sources_source_id_source_record_id_entity_type_unique" UNIQUE("source_id","source_record_id","entity_type")
);
--> statement-breakpoint
CREATE TABLE "content"."grammar_points" (
	"id" integer PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"category" text,
	"subcategory" text,
	"label_zh" text NOT NULL,
	"label_full_zh" text,
	"pattern" text,
	"exclude" text,
	"examples_zh" jsonb NOT NULL,
	"title_vi" text,
	"explanation_vi" text,
	"source_id" text NOT NULL,
	CONSTRAINT "grammar_points_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "content"."hsk_assignments" (
	"id" integer PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"standard" text NOT NULL,
	"level" text NOT NULL,
	"derived" boolean NOT NULL,
	"source_id" text NOT NULL,
	CONSTRAINT "hsk_assignments_entity_type_entity_id_standard_unique" UNIQUE("entity_type","entity_id","standard")
);
--> statement-breakpoint
CREATE TABLE "content"."import_runs" (
	"id" integer PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"stats" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."lesson_step_items" (
	"step_id" integer NOT NULL,
	"sort" integer NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	CONSTRAINT "lesson_step_items_step_id_sort_pk" PRIMARY KEY("step_id","sort")
);
--> statement-breakpoint
CREATE TABLE "content"."lesson_steps" (
	"id" integer PRIMARY KEY NOT NULL,
	"lesson_id" integer NOT NULL,
	"sort" integer NOT NULL,
	"step_type" text NOT NULL,
	"config" jsonb,
	CONSTRAINT "lesson_steps_lesson_id_sort_unique" UNIQUE("lesson_id","sort")
);
--> statement-breakpoint
CREATE TABLE "content"."lessons" (
	"id" integer PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"hsk_level" text NOT NULL,
	"sort" integer NOT NULL,
	"title_vi" text NOT NULL,
	"summary_vi" text,
	"status" text NOT NULL,
	"source_id" text NOT NULL,
	"source_record_id" text NOT NULL,
	CONSTRAINT "lessons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content"."review_queue" (
	"id" integer PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"issue" text NOT NULL,
	"detail" jsonb NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."sentence_grammar" (
	"sentence_id" integer NOT NULL,
	"grammar_point_id" integer NOT NULL,
	"source_id" text NOT NULL,
	CONSTRAINT "sentence_grammar_sentence_id_grammar_point_id_pk" PRIMARY KEY("sentence_id","grammar_point_id")
);
--> statement-breakpoint
CREATE TABLE "content"."sentence_tokens" (
	"sentence_id" integer NOT NULL,
	"position" integer NOT NULL,
	"surface" text NOT NULL,
	"word_id" integer,
	"pinyin" text,
	"gloss_en" text,
	"resolution" text NOT NULL,
	CONSTRAINT "sentence_tokens_sentence_id_position_pk" PRIMARY KEY("sentence_id","position")
);
--> statement-breakpoint
CREATE TABLE "content"."sentence_translations" (
	"id" integer PRIMARY KEY NOT NULL,
	"sentence_id" integer NOT NULL,
	"lang" text NOT NULL,
	"text" text NOT NULL,
	"status" text NOT NULL,
	"source_id" text NOT NULL,
	"source_record_id" text NOT NULL,
	CONSTRAINT "sentence_translations_sentence_id_lang_source_id_unique" UNIQUE("sentence_id","lang","source_id")
);
--> statement-breakpoint
CREATE TABLE "content"."sentences" (
	"id" integer PRIMARY KEY NOT NULL,
	"simplified" text NOT NULL,
	"traditional" text,
	"pinyin_marked" text,
	"pinyin_numbered" text,
	"topic" text,
	"sentence_type" text,
	"content_hash" text NOT NULL,
	CONSTRAINT "sentences_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "content"."source_versions" (
	"id" integer PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"version" text NOT NULL,
	"files" jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "source_versions_source_id_version_unique" UNIQUE("source_id","version")
);
--> statement-breakpoint
CREATE TABLE "content"."sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"license" text NOT NULL,
	"publishable" boolean NOT NULL,
	"via" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "content"."word_characters" (
	"word_id" integer NOT NULL,
	"position" integer NOT NULL,
	"character_id" integer NOT NULL,
	CONSTRAINT "word_characters_word_id_position_pk" PRIMARY KEY("word_id","position")
);
--> statement-breakpoint
CREATE TABLE "content"."word_senses" (
	"id" integer PRIMARY KEY NOT NULL,
	"word_id" integer NOT NULL,
	"lang" text NOT NULL,
	"text" text NOT NULL,
	"sort" integer NOT NULL,
	"status" text NOT NULL,
	"source_id" text NOT NULL,
	"source_record_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."words" (
	"id" integer PRIMARY KEY NOT NULL,
	"simplified" text NOT NULL,
	"traditional" text,
	"pinyin_key" text NOT NULL,
	"pinyin_numbered" text NOT NULL,
	"pinyin_marked" text NOT NULL,
	"kind" text NOT NULL,
	"in_curriculum" boolean NOT NULL,
	CONSTRAINT "words_simplified_pinyin_key_unique" UNIQUE("simplified","pinyin_key")
);
--> statement-breakpoint
ALTER TABLE "content"."audio_assets" ADD CONSTRAINT "audio_assets_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "content"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."character_readings" ADD CONSTRAINT "character_readings_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "content"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."character_readings" ADD CONSTRAINT "character_readings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "content"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."character_sino_viet" ADD CONSTRAINT "character_sino_viet_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "content"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."character_sino_viet" ADD CONSTRAINT "character_sino_viet_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "content"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."entity_sources" ADD CONSTRAINT "entity_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "content"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."entity_sources" ADD CONSTRAINT "entity_sources_source_version_id_source_versions_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "content"."source_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."grammar_points" ADD CONSTRAINT "grammar_points_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "content"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."hsk_assignments" ADD CONSTRAINT "hsk_assignments_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "content"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."lesson_step_items" ADD CONSTRAINT "lesson_step_items_step_id_lesson_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "content"."lesson_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."lesson_steps" ADD CONSTRAINT "lesson_steps_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "content"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."lessons" ADD CONSTRAINT "lessons_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "content"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."sentence_grammar" ADD CONSTRAINT "sentence_grammar_sentence_id_sentences_id_fk" FOREIGN KEY ("sentence_id") REFERENCES "content"."sentences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."sentence_grammar" ADD CONSTRAINT "sentence_grammar_grammar_point_id_grammar_points_id_fk" FOREIGN KEY ("grammar_point_id") REFERENCES "content"."grammar_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."sentence_grammar" ADD CONSTRAINT "sentence_grammar_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "content"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."sentence_tokens" ADD CONSTRAINT "sentence_tokens_sentence_id_sentences_id_fk" FOREIGN KEY ("sentence_id") REFERENCES "content"."sentences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."sentence_tokens" ADD CONSTRAINT "sentence_tokens_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "content"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."sentence_translations" ADD CONSTRAINT "sentence_translations_sentence_id_sentences_id_fk" FOREIGN KEY ("sentence_id") REFERENCES "content"."sentences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."sentence_translations" ADD CONSTRAINT "sentence_translations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "content"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."source_versions" ADD CONSTRAINT "source_versions_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "content"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."word_characters" ADD CONSTRAINT "word_characters_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "content"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."word_characters" ADD CONSTRAINT "word_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "content"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."word_senses" ADD CONSTRAINT "word_senses_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "content"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."word_senses" ADD CONSTRAINT "word_senses_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "content"."sources"("id") ON DELETE no action ON UPDATE no action;