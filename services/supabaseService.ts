
import { createClient } from '@supabase/supabase-js';
import { AppSettings } from '../types';
import { createBackup, restoreBackup, getSettings } from './storageService';

const BUCKET_NAME = 'inkread';
const FILE_NAME = 'inkread_data.json';

// Get Supabase Client Helper
const getSupabase = (settings: AppSettings) => {
    if (!settings.supabase_url || !settings.supabase_key) {
        throw new Error("Missing Supabase URL or Key");
    }
    return createClient(settings.supabase_url, settings.supabase_key, {
        global: {
            // Force no-cache for all requests to ensure fresh data
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        }
    });
};

export const testSupabaseConnection = async (settings: AppSettings): Promise<string> => {
    try {
        const supabase = getSupabase(settings);

        // 1. Try to list buckets (Informational only)
        // Note: For 'anon' keys, listBuckets often does NOT return private buckets even if policies exist.
        // So we don't fail hard here anymore.
        const { data } = await supabase.storage.listBuckets();
        const bucketFoundInList = data?.find(b => b.name === BUCKET_NAME);

        // 2. Write Permission Check (The Real Test)
        // We try to upload a small test file. If this works, the connection is GOOD regardless of listBuckets.
        const testFileName = 'connection_test_marker.txt';
        const testBlob = new Blob(['InkRead Connection Test'], { type: 'text/plain' });

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(testFileName, testBlob, {
                upsert: true,
                contentType: 'text/plain'
            });

        if (uploadError) {
            // ... (keep existing error handling for upload)
            if (!bucketFoundInList) {
                if (uploadError.message.includes('row-level security')) {
                    return `Write Failed: RLS Policy Error. Check INSERT/UPDATE policies for 'anon'.`;
                }
                return `Connection Failed: Could not access bucket '${BUCKET_NAME}'. (Error: ${uploadError.message})`;
            }

            return `Write Failed: ${uploadError.message}`;
        }

        // 3. Read Permission Check (New!)
        // Upload worked, now verify we can READ it back (SELECT policy).
        const { error: downloadError } = await supabase.storage
            .from(BUCKET_NAME)
            .download(testFileName);

        if (downloadError) {
            // Cleanup if possible, though read failed so we might not wait
            await supabase.storage.from(BUCKET_NAME).remove([testFileName]);

            if (downloadError.message.includes('row-level security') || downloadError.message.includes('Object not found')) {
                return `Read Failed: RLS Policy Error. Check SELECT policy for 'anon' role.`;
            }
            return `Read Failed: ${downloadError.message}`;
        }

        // 4. Cleanup
        await supabase.storage.from(BUCKET_NAME).remove([testFileName]);

        return "Connection, Write & Read Verified!";
    } catch (e: any) {
        return `Connection Failed: ${e.message}`;
    }
};

export const uploadDataToSupabase = async (settings: AppSettings): Promise<string> => {
    try {
        const supabase = getSupabase(settings);
        const backupJson = createBackup();

        // Convert string to Blob/File for Supabase Storage
        const blob = new Blob([backupJson], { type: 'application/json' });

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(FILE_NAME, blob, {
                cacheControl: '0',
                upsert: true,
                contentType: 'application/json'
            });

        if (error) throw error;

        return "Upload successful";
    } catch (e: any) {
        throw new Error(e.message);
    }
};

export const downloadDataFromSupabase = async (settings: AppSettings): Promise<string | null> => {
    try {
        const supabase = getSupabase(settings);

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .download(FILE_NAME);

        if (error) {
            if (error.message.includes('Object not found')) return null;
            throw error;
        }

        if (!data) return null;

        const text = await data.text();
        return text;
    } catch (e: any) {
        throw new Error(e.message);
    }
};
