import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeleteTransactionDialog } from '../delete-transaction-dialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock fetch globally
global.fetch = vi.fn()

describe('DeleteTransactionDialog', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const renderDialog = (props: {
    open: boolean
    onClose: () => void
    transactionId: string | null
  }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DeleteTransactionDialog {...props} />
      </QueryClientProvider>
    )
  }

  it('renders confirmation message', () => {
    renderDialog({
      open: true,
      onClose: () => {},
      transactionId: 'test-id',
    })

    expect(screen.getByText('Delete Transaction')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Are you sure you want to delete this transaction? This action cannot be undone.'
      )
    ).toBeInTheDocument()
  })

  it('handles successful deletion', async () => {
    const onClose = vi.fn()

    // Mock successful DELETE request
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response)
    )

    renderDialog({
      open: true,
      onClose,
      transactionId: 'test-id',
    })

    // Click delete button
    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)

    // Verify API call and dialog close
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/transactions/test-id',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('handles deletion error', async () => {
    const onClose = vi.fn()

    // Mock failed DELETE request
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Failed to delete' }),
      } as Response)
    )

    renderDialog({
      open: true,
      onClose,
      transactionId: 'test-id',
    })

    // Click delete button
    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText('Failed to delete transaction')).toBeInTheDocument()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  it('handles dialog close', () => {
    const onClose = vi.fn()

    renderDialog({
      open: true,
      onClose,
      transactionId: 'test-id',
    })

    // Click cancel button
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('disables buttons during deletion', async () => {
    // Mock slow DELETE request
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ success: true }),
            } as Response)
          }, 100)
        })
    )

    renderDialog({
      open: true,
      onClose: () => {},
      transactionId: 'test-id',
    })

    // Click delete button
    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)

    // Verify buttons are disabled
    await waitFor(() => {
      expect(deleteButton).toBeDisabled()
      expect(screen.getByText('Cancel')).toBeDisabled()
    })
  })
})