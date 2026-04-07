const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://felofmlhqwcdpiyjgstx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ');

async function applyCohortFix() {
  console.log('Applying cohort analysis fix...');
  
  // Drop the old function
  console.log('Dropping old function...');
  const { error: dropError } = await supabase.rpc('exec', { 
    sql: 'DROP FUNCTION IF EXISTS get_cohort_analysis_data(text);' 
  });
  
  if (dropError) {
    console.log('Drop error:', dropError.message);
  } else {
    console.log('Old function dropped successfully');
  }
  
  // Test the current function to see what it returns
  console.log('Testing current function...');
  const { data: currentData, error: currentError } = await supabase.rpc('get_cohort_analysis_data', { period_type: 'week' });
  
  if (currentError) {
    console.log('Current function error:', currentError.message);
  } else {
    console.log('Current function returns:', currentData.length, 'records');
    if (currentData.length > 0) {
      const latestCohort = currentData[currentData.length - 1];
      console.log('Latest cohort:', latestCohort.cohort_period);
      console.log('Period 1:', latestCohort.period_1);
      console.log('Period 2:', latestCohort.period_2);
      console.log('Period 3:', latestCohort.period_3);
      console.log('Period 4:', latestCohort.period_4);
    }
  }
}

applyCohortFix().catch(console.error);





