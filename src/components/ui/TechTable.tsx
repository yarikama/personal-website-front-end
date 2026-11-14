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
              {row.items.map((item, idx) => (
                <span key={item}>
                  <span className="inline-block rounded-sm hover:bg-sage hover:text-paper px-1 -mx-1 transition-colors duration-200 cursor-default">
                    {item}
                  </span>
                  {idx < row.items.length - 1 && ', '}
                </span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
