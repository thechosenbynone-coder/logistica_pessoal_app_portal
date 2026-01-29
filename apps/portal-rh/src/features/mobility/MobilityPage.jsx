import React from 'react'
import Card from '../../ui/Card.jsx'

export default function Page() {
  return (
    <Card className="p-5">
      <div className="text-sm font-semibold text-gray-800">Em desenvolvimento</div>
      <div className="mt-2 text-sm text-gray-600">
        Estrutura do módulo criada. Próximo passo: implementar CRUD, filtros e integrações com a API.
      </div>
    </Card>
  )
}
