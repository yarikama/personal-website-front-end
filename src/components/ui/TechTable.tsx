import { Fragment } from 'react'

interface TechCategory {
  category: string
  items: string[]
}

interface TechTableProps {
  data: TechCategory[]
  className?: string
}

export default function TechTable({ data, className = '' }: TechTableProps) {
  return (
    <table className={`tech-table w-full ${className}`}>
      <tbody>
        {data.map((row) => (
          <tr key={row.category}>
            <td className="whitespace-nowrap align-top">{row.category}</td>
            <td>
              {/* Each comma stays with the tool before it, so a line never
                  starts with one */}
              {row.items.map((item, idx) => (
                <Fragment key={item}>
                  <span className="whitespace-nowrap">
                    <span className="inline-block rounded-sm hover:bg-sage hover:text-paper px-1 -mx-1 transition-colors duration-200 cursor-default">
                      {item}
                    </span>
                    {idx < row.items.length - 1 && ','}
                  </span>
                  {idx < row.items.length - 1 && ' '}
                </Fragment>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
