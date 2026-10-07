import { categories, failed } from '../test/index'

const lines: string[] = []
for (const [category, { total, asserts, errors }] of categories) {
    errors.forEach(e => console.error(e))
    const label = `[${asserts}, ${total - errors.length}/${total}] ${category} tests passed`
    errors.length ? console.error(label) : console.log(label)
    lines.push(...errors, label)
}

document.getElementById('out')!.textContent = lines.join('\n')
document.title = failed ? 'fail :c' : 'pass! :3'
