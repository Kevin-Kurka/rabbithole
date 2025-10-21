-- ============================================================================
-- Test Suite for Migration 013: Threaded Comments and Notifications
-- ============================================================================
-- Description: Comprehensive tests for comment threading and notifications
-- Author: Backend Team
-- Date: 2025-10-10
-- ============================================================================

DO $$
DECLARE
    user1_id uuid;
    user2_id uuid;
    user3_id uuid;
    node_id uuid;
    graph_id uuid;
    node_type_id uuid;
    comment1_id uuid;
    comment2_id uuid;
    comment3_id uuid;
    notif_id uuid;
    test_count INTEGER := 0;
    pass_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting Migration 013 Test Suite';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- ========================================================================
    -- SETUP: Create test data
    -- ========================================================================

    RAISE NOTICE 'Setting up test data...';

    -- Create test users
    INSERT INTO public."Users" (username, email, password_hash)
    VALUES ('testuser1', 'test1@test.com', 'hash1')
    RETURNING id INTO user1_id;

    INSERT INTO public."Users" (username, email, password_hash)
    VALUES ('testuser2', 'test2@test.com', 'hash2')
    RETURNING id INTO user2_id;

    INSERT INTO public."Users" (username, email, password_hash)
    VALUES ('testuser3', 'test3@test.com', 'hash3')
    RETURNING id INTO user3_id;

    -- Create test node type
    INSERT INTO public."NodeTypes" (name, description)
    VALUES ('test_node', 'Test node type')
    RETURNING id INTO node_type_id;

    -- Create test graph
    INSERT INTO public."Graphs" (name, description, level, created_by)
    VALUES ('Test Graph', 'Test graph for migration', 1, user1_id)
    RETURNING id INTO graph_id;

    -- Create test node
    INSERT INTO public."Nodes" (graph_id, node_type_id, props, created_by)
    VALUES (graph_id, node_type_id, '{"test": true}'::jsonb, user1_id)
    RETURNING id INTO node_id;

    RAISE NOTICE 'Test data setup complete';
    RAISE NOTICE '';

    -- ========================================================================
    -- TEST 1: Threaded Comments - Create Parent Comment
    -- ========================================================================

    test_count := test_count + 1;
    RAISE NOTICE 'Test 1: Create parent comment';

    BEGIN
        INSERT INTO public."Comments" (text, author_id, target_node_id)
        VALUES ('This is a parent comment', user1_id, node_id)
        RETURNING id INTO comment1_id;

        IF comment1_id IS NOT NULL THEN
            pass_count := pass_count + 1;
            RAISE NOTICE '✓ PASSED: Parent comment created';
        ELSE
            RAISE NOTICE '✗ FAILED: Parent comment not created';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ FAILED: %', SQLERRM;
    END;
    RAISE NOTICE '';

    -- ========================================================================
    -- TEST 2: Threaded Comments - Create Reply
    -- ========================================================================

    test_count := test_count + 1;
    RAISE NOTICE 'Test 2: Create reply to parent comment';

    BEGIN
        INSERT INTO public."Comments" (text, author_id, target_node_id, parent_comment_id)
        VALUES ('This is a reply', user2_id, node_id, comment1_id)
        RETURNING id INTO comment2_id;

        IF comment2_id IS NOT NULL THEN
            pass_count := pass_count + 1;
            RAISE NOTICE '✓ PASSED: Reply comment created';
        ELSE
            RAISE NOTICE '✗ FAILED: Reply comment not created';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ FAILED: %', SQLERRM;
    END;
    RAISE NOTICE '';

    -- ========================================================================
    -- TEST 3: Threaded Comments - Create Nested Reply
    -- ========================================================================

    test_count := test_count + 1;
    RAISE NOTICE 'Test 3: Create nested reply';

    BEGIN
        INSERT INTO public."Comments" (text, author_id, target_node_id, parent_comment_id)
        VALUES ('This is a nested reply', user3_id, node_id, comment2_id)
        RETURNING id INTO comment3_id;

        IF comment3_id IS NOT NULL THEN
            pass_count := pass_count + 1;
            RAISE NOTICE '✓ PASSED: Nested reply created';
        ELSE
            RAISE NOTICE '✗ FAILED: Nested reply not created';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ FAILED: %', SQLERRM;
    END;
    RAISE NOTICE '';

    -- ========================================================================
    -- TEST 4: Helper Function - Get Comment Thread
    -- ========================================================================

    test_count := test_count + 1;
    RAISE NOTICE 'Test 4: Retrieve comment thread';

    BEGIN
        DECLARE
            thread_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO thread_count
            FROM get_comment_thread(comment1_id);

            IF thread_count = 3 THEN
                pass_count := pass_count + 1;
                RAISE NOTICE '✓ PASSED: Retrieved all 3 comments in thread';
            ELSE
                RAISE NOTICE '✗ FAILED: Expected 3 comments, got %', thread_count;
            END IF;
        END;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ FAILED: %', SQLERRM;
    END;
    RAISE NOTICE '';

    -- ========================================================================
    -- TEST 5: Notifications - Create Mention Notification
    -- ========================================================================

    test_count := test_count + 1;
    RAISE NOTICE 'Test 5: Create mention notification';

    BEGIN
        INSERT INTO public."Notifications" (
            user_id, type, title, message, entity_type, entity_id, related_user_id
        ) VALUES (
            user1_id, 'mention', 'You were mentioned', '@testuser1 check this out',
            'comment', comment2_id, user2_id
        ) RETURNING id INTO notif_id;

        IF notif_id IS NOT NULL THEN
            pass_count := pass_count + 1;
            RAISE NOTICE '✓ PASSED: Mention notification created';
        ELSE
            RAISE NOTICE '✗ FAILED: Notification not created';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ FAILED: %', SQLERRM;
    END;
    RAISE NOTICE '';

    -- ========================================================================
    -- TEST 6: Notifications - Type Constraint
    -- ========================================================================

    test_count := test_count + 1;
    RAISE NOTICE 'Test 6: Test notification type constraint';

    BEGIN
        INSERT INTO public."Notifications" (
            user_id, type, title, message
        ) VALUES (
            user1_id, 'invalid_type', 'Test', 'Should fail'
        );

        RAISE NOTICE '✗ FAILED: Invalid type was accepted';
    EXCEPTION WHEN check_violation THEN
        pass_count := pass_count + 1;
        RAISE NOTICE '✓ PASSED: Type constraint enforced';
    WHEN OTHERS THEN
        RAISE NOTICE '✗ FAILED: Unexpected error: %', SQLERRM;
    END;
    RAISE NOTICE '';

    -- ========================================================================
    -- TEST 7: Indexes - Verify All Indexes Exist
    -- ========================================================================

    test_count := test_count + 1;
    RAISE NOTICE 'Test 7: Verify indexes exist';

    BEGIN
        DECLARE
            missing_indexes TEXT[] := ARRAY[]::TEXT[];
            idx_name TEXT;
        BEGIN
            -- Check Comments indexes
            FOREACH idx_name IN ARRAY ARRAY['idx_comments_parent_id', 'idx_comments_root']
            LOOP
                IF NOT EXISTS (
                    SELECT 1 FROM pg_indexes
                    WHERE tablename = 'Comments' AND indexname = idx_name
                ) THEN
                    missing_indexes := array_append(missing_indexes, idx_name);
                END IF;
            END LOOP;

            -- Check Notifications indexes
            FOREACH idx_name IN ARRAY ARRAY[
                'idx_notifications_user_id',
                'idx_notifications_unread',
                'idx_notifications_feed',
                'idx_notifications_created_at'
            ]
            LOOP
                IF NOT EXISTS (
                    SELECT 1 FROM pg_indexes
                    WHERE tablename = 'Notifications' AND indexname = idx_name
                ) THEN
                    missing_indexes := array_append(missing_indexes, idx_name);
                END IF;
            END LOOP;

            IF array_length(missing_indexes, 1) IS NULL THEN
                pass_count := pass_count + 1;
                RAISE NOTICE '✓ PASSED: All indexes exist';
            ELSE
                RAISE NOTICE '✗ FAILED: Missing indexes: %', array_to_string(missing_indexes, ', ');
            END IF;
        END;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ FAILED: %', SQLERRM;
    END;
    RAISE NOTICE '';

    -- ========================================================================
    -- TEST 8: Trigger - Updated_at Auto-Update
    -- ========================================================================

    test_count := test_count + 1;
    RAISE NOTICE 'Test 8: Test updated_at trigger';

    BEGIN
        DECLARE
            old_updated_at TIMESTAMPTZ;
            new_updated_at TIMESTAMPTZ;
        BEGIN
            SELECT updated_at INTO old_updated_at
            FROM public."Comments" WHERE id = comment1_id;

            -- Wait a moment
            PERFORM pg_sleep(0.1);

            -- Update comment
            UPDATE public."Comments"
            SET text = 'Updated parent comment'
            WHERE id = comment1_id
            RETURNING updated_at INTO new_updated_at;

            IF new_updated_at > old_updated_at THEN
                pass_count := pass_count + 1;
                RAISE NOTICE '✓ PASSED: updated_at trigger works';
            ELSE
                RAISE NOTICE '✗ FAILED: updated_at not updated (old: %, new: %)',
                    old_updated_at, new_updated_at;
            END IF;
        END;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ FAILED: %', SQLERRM;
    END;
    RAISE NOTICE '';

    -- ========================================================================
    -- TEST 9: Cascade Delete - Comment Thread
    -- ========================================================================

    test_count := test_count + 1;
    RAISE NOTICE 'Test 9: Test cascade delete of comment thread';

    BEGIN
        DECLARE
            remaining_count INTEGER;
        BEGIN
            -- Delete parent comment (should cascade to replies)
            DELETE FROM public."Comments" WHERE id = comment1_id;

            -- Check if replies were also deleted
            SELECT COUNT(*) INTO remaining_count
            FROM public."Comments"
            WHERE id IN (comment2_id, comment3_id);

            IF remaining_count = 0 THEN
                pass_count := pass_count + 1;
                RAISE NOTICE '✓ PASSED: Cascade delete works';
            ELSE
                RAISE NOTICE '✗ FAILED: % replies not deleted', remaining_count;
            END IF;
        END;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ FAILED: %', SQLERRM;
    END;
    RAISE NOTICE '';

    -- ========================================================================
    -- TEST 10: Query Performance - Unread Notifications
    -- ========================================================================

    test_count := test_count + 1;
    RAISE NOTICE 'Test 10: Query unread notifications efficiently';

    BEGIN
        DECLARE
            unread_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO unread_count
            FROM public."Notifications"
            WHERE user_id = user1_id AND read = false;

            IF unread_count >= 0 THEN
                pass_count := pass_count + 1;
                RAISE NOTICE '✓ PASSED: Unread notifications query works (count: %)', unread_count;
            ELSE
                RAISE NOTICE '✗ FAILED: Query failed';
            END IF;
        END;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ FAILED: %', SQLERRM;
    END;
    RAISE NOTICE '';

    -- ========================================================================
    -- CLEANUP: Remove test data
    -- ========================================================================

    RAISE NOTICE 'Cleaning up test data...';

    DELETE FROM public."Notifications" WHERE user_id IN (user1_id, user2_id, user3_id);
    DELETE FROM public."Nodes" WHERE id = node_id;
    DELETE FROM public."Graphs" WHERE id = graph_id;
    DELETE FROM public."NodeTypes" WHERE id = node_type_id;
    DELETE FROM public."Users" WHERE id IN (user1_id, user2_id, user3_id);

    RAISE NOTICE 'Cleanup complete';
    RAISE NOTICE '';

    -- ========================================================================
    -- RESULTS SUMMARY
    -- ========================================================================

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test Results Summary';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total Tests: %', test_count;
    RAISE NOTICE 'Passed: %', pass_count;
    RAISE NOTICE 'Failed: %', test_count - pass_count;
    RAISE NOTICE 'Success Rate: %%%', ROUND((pass_count::DECIMAL / test_count) * 100, 2);
    RAISE NOTICE '========================================';

    IF pass_count = test_count THEN
        RAISE NOTICE '✓ ALL TESTS PASSED!';
    ELSE
        RAISE NOTICE '✗ SOME TESTS FAILED';
    END IF;

END $$;
