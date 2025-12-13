import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'

const router = express.Router()

/**
 * GET /api/budget
 * Get user's budget (requires authentication)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const { data: budget, error } = await supabase
      .from('user_budgets')
      .select('id, budget_amount, budget_period, created_at, updated_at')
      .eq('user_id', req.userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return res.status(404).json({ error: 'Budget not found', budget: null })
      }
      console.error('Get budget error:', error)
      return res.status(500).json({ error: 'Failed to fetch budget' })
    }

    res.json({
      budget: {
        id: budget.id,
        amount: budget.budget_amount,
        period: budget.budget_period,
        created_at: budget.created_at,
        updated_at: budget.updated_at,
      }
    })
  } catch (error) {
    console.error('Get budget error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * POST /api/budget
 * Create or update user's budget (requires authentication)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { amount, period } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid budget amount is required' })
    }

    if (!period || !['weekly', 'monthly', 'yearly'].includes(period)) {
      return res.status(400).json({ error: 'Valid period (weekly, monthly, yearly) is required' })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Check if budget already exists
    const { data: existingBudget } = await supabase
      .from('user_budgets')
      .select('id')
      .eq('user_id', req.userId)
      .single()

    let budget
    if (existingBudget) {
      // Update existing budget
      const { data: updatedBudget, error: updateError } = await supabase
        .from('user_budgets')
        .update({
          budget_amount: parseFloat(amount),
          budget_period: period,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', req.userId)
        .select('id, budget_amount, budget_period, created_at, updated_at')
        .single()

      if (updateError) {
        console.error('Update budget error:', updateError)
        return res.status(500).json({ error: 'Failed to update budget' })
      }

      budget = updatedBudget
    } else {
      // Create new budget
      const { data: newBudget, error: createError } = await supabase
        .from('user_budgets')
        .insert([
          {
            user_id: req.userId,
            budget_amount: parseFloat(amount),
            budget_period: period,
          }
        ])
        .select('id, budget_amount, budget_period, created_at, updated_at')
        .single()

      if (createError) {
        console.error('Create budget error:', createError)
        return res.status(500).json({ error: 'Failed to create budget' })
      }

      budget = newBudget
    }

    res.json({
      budget: {
        id: budget.id,
        amount: budget.budget_amount,
        period: budget.budget_period,
        created_at: budget.created_at,
        updated_at: budget.updated_at,
      }
    })
  } catch (error) {
    console.error('Save budget error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

export { router as budgetRouter }

