import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionFormDialog } from '../transaction-form-dialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
    },
    status: 'authenticated',
  }),
}))

// Mock fetch globally
global.fetch = vi.fn()

// Create mock data
const mockAccount = { id: 'test-account-1', name: 'Test Account' }
const mockCategory = { id: 'test-category-1', name: 'Test Category' }
const mockMerchant = { id: 'test-merchant-1', name: 'Test Merchant' }

const mockTransaction = {
  id: 'test-id-1',
  accountId: mockAccount.id,
  description: 'Test Transaction',
  amount: 50.00,
  date: '2025-10-13',
  type: 'EXPENSE' as const,
  categoryId: mockCategory.id,
  merchantId: mockMerchant.id,
}

describe('TransactionFormDialog', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    // Mock successful data fetches
    vi.mocked(fetch).mockImplementation((url) => {
      let data = {}

      if (url.toString().includes('/api/accounts')) {
        data = { accounts: [mockAccount] }
      } else if (url.toString().includes('/api/categories')) {
        data = { categories: [mockCategory] }
      } else if (url.toString().includes('/api/merchants')) {
        data = { merchants: [mockMerchant] }
      } else if (url.toString().includes('/api/transactions')) {
        data = { id: 'new-transaction-id' }
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as Response)
    })
  })

  it('renders empty form correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionFormDialog
          open={true}
          onClose={() => {}}
          transaction={null}
        />
      </QueryClientProvider>
    )

    expect(screen.getByText('Add New Transaction')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
  })

  it('renders edit form with transaction data', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionFormDialog
          open={true}
          onClose={() => {}}
          transaction={mockTransaction}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Edit Transaction')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('Test Transaction')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2025-10-13')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TransactionFormDialog
          open={true}
          onClose={() => {}}
          transaction={null}
        />
      </QueryClientProvider>
    )

    // Wait for form to be ready
    await waitFor(() => {
      expect(screen.getByText('Add New Transaction')).toBeInTheDocument()
    })

    // Try to submit empty form
    const submitButton = screen.getByText('Add Transaction')
    fireEvent.click(submitButton)

    // Check for validation messages (they appear in p elements with data-invalid attributes)
    await waitFor(() => {
      const errorMessages = container.querySelectorAll('p[data-invalid]')
      const messages = Array.from(errorMessages).map(msg => msg.textContent)
      expect(messages).toContain('Description is required')
      expect(messages).toContain('Account is required')
    })
  })

  it('handles successful form submission', async () => {
    const onClose = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <TransactionFormDialog
          open={true}
          onClose={onClose}
          transaction={null}
        />
      </QueryClientProvider>
    )

    // Fill out form
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'New Transaction' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '75.00' },
    })
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2025-10-13' },
    })
    fireEvent.change(screen.getByLabelText('Account'), {
      target: { value: mockAccount.id },
    })

    // Mock successful POST request
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'new-test-id' }),
      } as Response)
    )

    // Submit form
    const submitButton = screen.getByText('Add Transaction')
    fireEvent.click(submitButton)

    // Verify form submission and dialog close
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/transactions',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      )
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('handles form submission errors', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionFormDialog
          open={true}
          onClose={() => {}}
          transaction={null}
        />
      </QueryClientProvider>
    )

    // Fill out form
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'New Transaction' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '75.00' },
    })
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2025-10-13' },
    })
    fireEvent.change(screen.getByLabelText('Account'), {
      target: { value: mockAccount.id },
    })

    // Mock failed POST request
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad Request' }),
      } as Response)
    )

    // Submit form
    const submitButton = screen.getByText('Add Transaction')
    fireEvent.click(submitButton)

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText('Failed to create transaction')).toBeInTheDocument()
    })
  })

  it('handles closing the dialog', () => {
    const onClose = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <TransactionFormDialog
          open={true}
          onClose={onClose}
          transaction={null}
        />
      </QueryClientProvider>
    )

    // Click cancel button
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })
})