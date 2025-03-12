import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

// This API route is for setting up the database schema
// It should only be run once during initial setup

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check if the table already exists
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'pr_metrics');
      
    if (tablesError) {
      console.error('Error checking if table exists:', tablesError);
      return NextResponse.json({ error: 'Failed to check if table exists' }, { status: 500 });
    }
    
    // If table already exists, return success
    if (tables && tables.length > 0) {
      return NextResponse.json({ message: 'Table pr_metrics already exists' }, { status: 200 });
    }
    
    // Create the pr_metrics table
    const { error } = await supabase.rpc('create_pr_metrics_table', {});
    
    if (error) {
      // If RPC fails, try direct SQL (might need admin privileges)
      const sqlResult = await supabase.from('pr_metrics').select('*').limit(1);
      
      if (sqlResult.error) {
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS pr_metrics (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            repository TEXT NOT NULL,
            pr_count INT NOT NULL,
            total_additions INT NOT NULL,
            total_deletions INT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE UNIQUE INDEX IF NOT EXISTS pr_metrics_user_repo_idx ON pr_metrics (user_id, repository);
        `;
        
        const { error: createError } = await supabase.rpc('execute_sql', { sql_query: createTableQuery });
        
        if (createError) {
          console.error('Failed to create table using SQL:', createError);
          return NextResponse.json({ 
            error: 'Failed to create table, please set up the table manually in Supabase dashboard',
            schema: createTableQuery
          }, { status: 500 });
        }
      }
    }
    
    return NextResponse.json({ message: 'Database setup completed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json({ error: 'Failed to set up database' }, { status: 500 });
  }
} 