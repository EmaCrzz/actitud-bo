'use client'

import { useState } from 'react'
import { Inbox, MoreHorizontal, Plus } from 'lucide-react'
import Button from './ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/format-person'
import ConfirmDialog from './ConfirmDialog'
import DataTable, { DataTableMobileRow, type DataTableColumn } from './DataTable'
import EmptyState from './EmptyState'
import FilterBar from './FilterBar'
import FilterDropdown from './FilterDropdown'
import PageHeader from './PageHeader'
import SidePanel from './SidePanel'
import StatusBadge from './ui/StatusBadge'
import Stepper from './Stepper'

// NOTA: este archivo está deliberadamente exento de la regla de i18n del
// proyecto. Es un harness de desarrollo, no UI de producto: sus strings son
// etiquetas para el dev que revisa los componentes, no copy que vaya a ver un
// usuario final. Meterlos al diccionario implicaría agregar ~20 keys que habría
// que borrar cuando esta página se elimine. Queda documentado en el ADR de la
// fase 5 como excepción consciente.

type Row = { id: string; name: string; plan: string; status: 'active' | 'expired' }

const ROWS: Row[] = [
  { id: '1', name: 'Ana Beltrán', plan: '5 días', status: 'expired' },
  { id: '2', name: 'Carlos Díaz', plan: '3 días', status: 'expired' },
  { id: '3', name: 'Elena Fernández', plan: '5 días', status: 'active' },
  { id: '4', name: 'Gabriel Herrera', plan: '3 días', status: 'active' },
]

export default function PrimitivesSandbox() {
  const [query, setQuery] = useState('')
  const [plan, setPlan] = useState('all')
  const [panelOpen, setPanelOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [tableState, setTableState] = useState<'data' | 'loading' | 'empty'>('data')

  const visible = ROWS.filter(
    (row) =>
      row.name.toLowerCase().includes(query.toLowerCase()) &&
      (plan === 'all' || row.plan === plan)
  )

  const columns: DataTableColumn<Row>[] = [
    { id: 'name', header: 'Cliente', cell: (row) => <span className='font-medium'>{row.name}</span> },
    { id: 'plan', header: 'Membresía', cell: (row) => row.plan },
    {
      id: 'status',
      header: 'Estado',
      align: 'right',
      cell: (row) => (
        <StatusBadge tone={row.status === 'active' ? 'success' : 'danger'}>
          {row.status === 'active' ? 'Activo' : 'Vencida'}
        </StatusBadge>
      ),
    },
  ]

  return (
    <div className='flex h-full flex-col gap-8 overflow-y-auto rounded-lg border p-5'>
      <PageHeader
        action={
          <Button onClick={() => setPanelOpen(true)}>
            <Plus className='size-4' /> Abrir SidePanel
          </Button>
        }
        subtitle='Banco de pruebas de las primitivas de la fase 5 — no es producto'
        title='Sandbox de primitivas v2'
      />

      <Section title='FilterBar + FilterDropdown'>
        <FilterBar
          action={<Button variant='outlined'>Nuevo</Button>}
          search={<FilterBar.Search value={query} onChange={setQuery} />}
        >
          <FilterDropdown
            label='Membresía'
            options={[
              { value: '5 días', label: '5 días' },
              { value: '3 días', label: '3 días' },
            ]}
            value={plan}
            onChange={setPlan}
          />
        </FilterBar>
      </Section>

      <Section title='DataTable — achicá la ventana a menos de 768px para ver el render mobile'>
        <div className='mb-3 flex gap-2'>
          {(['data', 'loading', 'empty'] as const).map((state) => (
            <Button
              key={state}
              size='sm'
              variant={tableState === state ? 'contained' : 'outlined'}
              onClick={() => setTableState(state)}
            >
              {state}
            </Button>
          ))}
        </div>
        <DataTable
          columns={columns}
          empty={
            <EmptyState
              description='Cuando registres el primero va a aparecer acá.'
              icon={<Inbox className='size-6' />}
              title='Todavía no hay nada'
            />
          }
          getRowId={(row) => row.id}
          isLoading={tableState === 'loading'}
          mobileRow={(row) => (
            <DataTableMobileRow
              badge={
                <StatusBadge tone={row.status === 'active' ? 'success' : 'danger'}>
                  {row.status === 'active' ? 'Activo' : 'Vencida'}
                </StatusBadge>
              }
              initials={getInitials(row.name)}
              subtitle={`Membresía: ${row.plan}`}
              title={row.name}
            />
          )}
          rowActions={() => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label='Más acciones' size='icon' variant='ghost'>
                  <MoreHorizontal className='size-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='!p-1' data-v2='true'>
                <DropdownMenuItem>Ver</DropdownMenuItem>
                <DropdownMenuItem>Editar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          rows={tableState === 'empty' ? [] : visible}
        />
      </Section>

      <Section title='Stepper'>
        <Stepper current={step} steps={['Datos personales', 'Membresía inicial']} />
        <div className='mt-3 flex gap-2'>
          <Button size='sm' variant='outlined' onClick={() => setStep(0)}>
            Paso 1
          </Button>
          <Button size='sm' variant='outlined' onClick={() => setStep(1)}>
            Paso 2
          </Button>
        </div>
      </Section>

      <Section title='ConfirmDialog'>
        <Button variant='outlined' onClick={() => setConfirmOpen(true)}>
          Abrir confirmación destructiva
        </Button>
      </Section>

      <SidePanel
        description='Complete los datos para registrar un cliente.'
        footer={
          <div className='flex gap-3'>
            <Button className='flex-1' variant='outlined' onClick={() => setPanelOpen(false)}>
              Cancelar
            </Button>
            <Button className='flex-1'>Siguiente</Button>
          </div>
        }
        open={panelOpen}
        pinned={<Stepper current={step} steps={['Datos personales', 'Membresía inicial']} />}
        title='Nuevo cliente'
        onOpenChange={setPanelOpen}
      >
        <div className='flex flex-col gap-3'>
          {ROWS.map((row) => (
            <DataTableMobileRow
              key={row.id}
              badge={
                <StatusBadge tone={row.status === 'active' ? 'success' : 'danger'}>
                  {row.status === 'active' ? 'Activo' : 'Vencida'}
                </StatusBadge>
              }
              initials={getInitials(row.name)}
              subtitle={`Membresía: ${row.plan}`}
              title={row.name}
            />
          ))}
        </div>
      </SidePanel>

      <ConfirmDialog
        destructive
        confirmLabel='Eliminar'
        description='Esta acción no se puede deshacer.'
        open={confirmOpen}
        title='¿Eliminar el gasto?'
        onConfirm={() => setConfirmOpen(false)}
        onOpenChange={setConfirmOpen}
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-sm font-semibold text-muted-foreground'>{title}</h2>
      {children}
    </section>
  )
}
