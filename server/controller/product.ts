import type { Prisma } from '@prisma/client'
import type { H3Event } from 'h3'
import { ResponseMessage } from '~/config/message'

// news
type FindListQueryParam = {
    type: number
    title: string
} & ListPage

/**
 * 列表查询
 * @param event
 * @returns
 */
export const getList = async (event: H3Event) => {
    const url = getRequestURL(event)
    // /api/page**的接口，跳过登录校验
    if (!url.pathname.includes('/api/page')) {
        // 接口校验(是否登录)
        if (!event.context.user) return ResponseMessage.token
    }

    // 获取参数
    const param = await getEventParams<FindListQueryParam>(event)

    // if (!param?.type) return { msg: '请传递类型' }
    const where: any = {
        // classifyId,
        title: {
            contains: param?.title, // 包含
        },
    }

    if (param?.type) where.classifyId = Number(param?.type)

    // 查询菜单姓"张"，1页显示20条
    let page: number | undefined
    let pageSize: number | undefined
    let pageSkip: number | undefined

    if (param?.isPage) {
        page = Number(param.page) || 1
        pageSize = Number(param.pageSize) || 20
        pageSkip = pageSize * (page - 1) || 0
    }
    console.log('where :>> ', where)
    const [res1, res2] = await Promise.all([
        event.context.prisma.product.findMany({
            skip: pageSkip,
            take: pageSize,
            where,
            orderBy: {
                sort: 'desc', // 按id正序排序
            },
            include: {
                links: true,
                classify: {
                    select: {
                        title: true,
                    },
                },
            },
            // select: { // 只返回指定的字段
            //     username: true,
            //     account: true,
            // },
        }),
        event.context.prisma.product.count({
            where,
        }),
    ])

    if (res1) {
        return { code: 200, data: { list: res1, total: res2 } }
    } else {
        return { code: 400, message: '查询失败' }
    }
}

/**
 * 新增
 * @param event
 * @returns
 */
export const insert = async (event: H3Event) => {
    // 接口校验(是否登录)
    if (!event.context.user) return ResponseMessage.token

    // 获取参数
    const param = await getEventParams<IProductCreateParam>(event)
    // console.log('param-----', param)
    if (!param?.title) return { msg: '标题不能为空' }

    const res = await event.context.prisma.product.create({
        data: {
            ...param,
            links: {
                createMany: {
                    data: param.links,
                },
            },
        },
    })

    if (res) {
        return { code: 200, msg: '添加成功' }
    } else {
        return { msg: '网络错误' }
    }
}

/**
 * 修改
 * @param event
 * @returns
 */
export const update = async (event: H3Event) => {
    // 接口校验(是否登录)
    if (!event.context.user) return ResponseMessage.token

    // 获取参数
    const param = await getEventParams<IProductCreateParamEdit>(event)
    // console.log('param-----', param)

    if (!param?.id) return { msg: '缺少参数id' }
    if (!param?.title) return { msg: '标题不能为空' }

    const links = await event.context.prisma.link.findMany({
        where: {
            productId: param.id,
        },
    })
    // const dat: Prisma.LinkUpdateManyWithWhereWithoutProductInput = {}
    const addLinks: Prisma.LinkCreateManyInput[] = []

    const updateIds: number[] = []
    for (const item of param.links) {
        const node = links.find((i) => {
            if (item.type === 1) return i.img === item.img
            else return i.href === item.href
        })
        if (node) {
            updateIds.push(node.id)
            await event.context.prisma.link.update({
                where: {
                    id: node.id,
                },
                data: {
                    title: item.title || '',
                    content: item.content || '',
                    img: item.img || '',
                    href: item.href || '',
                    type: item.type,
                },
            })
        } else {
            const dat: Prisma.LinkCreateManyInput = {
                title: item.title || '',
                content: item.content || '',
                img: item.img || '',
                href: item.href || '',
                type: item.type,
                // productId: param.id,
            }
            addLinks.push(dat)
        }
    }

    // 过滤已更新的数据（剩余的为删除）
    const delIds: Prisma.LinkScalarWhereInput[] = links.filter(item => !updateIds.includes(item.id)).map(item => ({ id: item.id }))
    // console.log('param :>> ', param)
    // return { code: 200, msg: '修改成功', param }

    const res = await event.context.prisma.product.update({
        data: {
            ...param,
            links: {
                createMany: {
                    data: addLinks,
                },
                deleteMany: delIds,
                // updateMany: [{ id: 1 }],
            },
        },
        where: {
            id: param.id,
        },
    })

    if (res) {
        return { code: 200, msg: '修改成功' }
    } else {
        return { msg: '网络错误' }
    }
}

/**
 * 删除
 * @param event
 * @returns
 */
export const del = async (event: H3Event) => {
    // 接口校验(是否登录)
    if (!event.context.user) return ResponseMessage.token

    // 获取参数
    const param = await getEventParams<{ id: number }>(event)
    // console.log('param-----', param)

    if (!param?.id) return { msg: '缺少参数id' }

    const res = await event.context.prisma.product.delete({
        where: {
            id: param.id,
        },
    })

    if (res) {
        return { code: 200, msg: '删除成功' }
    } else {
        return { msg: '网络错误' }
    }
}
